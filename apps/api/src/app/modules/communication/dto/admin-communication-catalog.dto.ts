import { Field, ObjectType } from '@nestjs/graphql';
import { AdminCommunicationRuleView } from './admin-communication-rule-view.dto';

@ObjectType()
export class AdminCommunicationCatalog {
  @Field(() => [AdminCommunicationRuleView])
  events: AdminCommunicationRuleView[];

  @Field()
  emailConfigured: boolean;

  @Field()
  pushConfigured: boolean;

  @Field()
  smsConfigured: boolean;

  @Field()
  whatsappConfigured: boolean;
}
