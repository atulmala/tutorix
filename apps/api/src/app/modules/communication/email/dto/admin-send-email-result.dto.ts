import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminSendEmailResult {
  @Field()
  success: boolean;

  @Field(() => String, { nullable: true, description: 'SES MessageId when provider is ses' })
  messageId: string | null;
}
