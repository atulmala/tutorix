import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class AdminReviewEducationDocumentInput {
  @Field(() => Int)
  documentId: number;

  @Field()
  approve: boolean;

  @Field({ nullable: true })
  note?: string;
}
