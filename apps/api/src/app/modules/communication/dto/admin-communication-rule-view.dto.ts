import { Field, Int, ObjectType } from '@nestjs/graphql';
import { CommunicationAudience } from '../enums/communication-audience.enum';
import { CommunicationEvent } from '../enums/communication-event.enum';
import { AdminCommunicationChannelTemplate } from './admin-communication-channel-template.dto';

@ObjectType()
export class AdminCommunicationRuleView {
  @Field(() => CommunicationEvent)
  event: CommunicationEvent;

  @Field(() => CommunicationAudience)
  audience: CommunicationAudience;

  @Field()
  label: string;

  @Field()
  enabled: boolean;

  @Field()
  mandatory: boolean;

  @Field()
  emailEnabled: boolean;

  @Field()
  smsEnabled: boolean;

  @Field()
  pushEnabled: boolean;

  @Field()
  whatsappEnabled: boolean;

  @Field(() => Int, { nullable: true })
  offsetMinutes?: number | null;

  @Field(() => [String])
  allowedVariables: string[];

  @Field()
  samplePayloadJson: string;

  @Field(() => [AdminCommunicationChannelTemplate])
  templates: AdminCommunicationChannelTemplate[];
}
