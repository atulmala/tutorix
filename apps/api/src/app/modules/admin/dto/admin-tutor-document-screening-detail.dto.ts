import { Field, Float, ObjectType } from '@nestjs/graphql';
import { DocumentScreeningStatusEnum } from '../../document/enums/document-screening-status.enum';

@ObjectType()
export class AdminTutorDocumentScreeningDetail {
  @Field(() => DocumentScreeningStatusEnum)
  status: DocumentScreeningStatusEnum;

  @Field({ nullable: true })
  summaryNotes?: string;

  @Field(() => Float, { nullable: true })
  confidence?: number;

  @Field({ nullable: true })
  automatedAt?: Date;

  @Field({ nullable: true })
  reviewerNote?: string;

  @Field({ nullable: true })
  reviewedAt?: Date;
}
