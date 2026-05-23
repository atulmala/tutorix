import { Field, Int, ObjectType } from '@nestjs/graphql';
import { DocumentTypeEnum } from '../../document/enums/document-type.enum';
import { AdminTutorDocumentScreeningDetail } from './admin-tutor-document-screening-detail.dto';

@ObjectType()
export class AdminTutorDocumentDetail {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  name?: string;

  @Field(() => DocumentTypeEnum, { nullable: true })
  documentType?: DocumentTypeEnum;

  @Field({ nullable: true })
  filename?: string;

  @Field({ nullable: true })
  mimeType?: string;

  @Field({ nullable: true })
  previewUrl?: string;

  @Field({ nullable: true, description: 'Presigned URL for full document (e.g. PDF)' })
  viewUrl?: string;

  @Field(() => AdminTutorDocumentScreeningDetail, { nullable: true })
  screening?: AdminTutorDocumentScreeningDetail;
}
