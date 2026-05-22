import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentScreeningEntity } from '../entities/document-screening.entity';
import { DocumentService } from '../services/document.service';

type GraphqlContext = { req: { user?: User | null } };

@Resolver(() => DocumentEntity)
export class DocumentEntityResolver {
  constructor(
    private readonly documentService: DocumentService,
    @InjectRepository(DocumentScreeningEntity)
    private readonly screeningRepo: Repository<DocumentScreeningEntity>,
  ) {}

  @ResolveField('screening', () => DocumentScreeningEntity, {
    nullable: true,
    description: 'AI / human screening status for this document',
  })
  async screening(
    @Parent() doc: DocumentEntity,
  ): Promise<DocumentScreeningEntity | null> {
    if (!doc.id) {
      return null;
    }
    return this.screeningRepo.findOne({
      where: { document: { id: doc.id } },
    });
  }

  @ResolveField('previewUrl', () => String, {
    nullable: true,
    description: 'Presigned or public HTTPS URL for document thumbnail preview',
  })
  async previewUrl(
    @Parent() doc: DocumentEntity,
    @Context() ctx: GraphqlContext,
  ): Promise<string | null> {
    if (!doc.storageKey) {
      return null;
    }
    try {
      return await this.documentService.resolvePreviewUrl(doc, ctx.req.user);
    } catch {
      return null;
    }
  }
}
