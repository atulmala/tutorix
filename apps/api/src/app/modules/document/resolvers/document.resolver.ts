import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { ConfirmTutorDocumentUploadInput } from '../dto/confirm-tutor-document-upload.input';
import { RequestTutorDocumentUploadUrlInput } from '../dto/request-tutor-document-upload-url.input';
import { TutorDocumentUploadUrlResult } from '../dto/tutor-document-upload-url.result';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentService } from '../services/document.service';

@Resolver()
export class DocumentUploadResolver {
  constructor(private readonly documentService: DocumentService) {}

  @Mutation(() => TutorDocumentUploadUrlResult, {
    description:
      'Get a presigned S3 PUT URL for one tutor onboarding document (docs step only)',
  })
  @UseGuards(JwtAuthGuard)
  async requestTutorDocumentUploadUrl(
    @CurrentUser() user: User,
    @Args('input') input: RequestTutorDocumentUploadUrlInput,
  ): Promise<TutorDocumentUploadUrlResult> {
    return this.documentService.requestTutorDocumentUploadUrl(user, input);
  }

  @Mutation(() => DocumentEntity, {
    description:
      'Confirm that the file was uploaded to S3 and persist document metadata',
  })
  @UseGuards(JwtAuthGuard)
  async confirmTutorDocumentUpload(
    @CurrentUser() user: User,
    @Args('input') input: ConfirmTutorDocumentUploadInput,
  ): Promise<DocumentEntity> {
    return this.documentService.confirmTutorDocumentUpload(user, input);
  }
}

@Resolver(() => Tutor)
export class TutorDocumentsFieldResolver {
  constructor(private readonly documentService: DocumentService) {}

  @ResolveField('documents', () => [DocumentEntity], {
    description: 'Documents linked to this tutor',
  })
  async documents(@Parent() tutor: Tutor): Promise<DocumentEntity[]> {
    return this.documentService.findDocumentsByTutorId(tutor.id);
  }
}
