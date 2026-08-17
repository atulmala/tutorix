import { Field, ObjectType } from '@nestjs/graphql';
import { CommunicationChannel } from '../enums/communication-channel.enum';

@ObjectType()
export class AdminCommunicationChannelTemplate {
  @Field(() => CommunicationChannel)
  channel: CommunicationChannel;

  @Field()
  templatePath: string;

  @Field(() => String, { nullable: true })
  subject?: string | null;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => String, { nullable: true })
  text?: string | null;

  @Field()
  body: string;

  @Field(() => String, { nullable: true })
  dltTemplateId?: string | null;

  @Field(() => String, { nullable: true })
  dltEntityId?: string | null;

  @Field(() => String, { nullable: true })
  dltHeader?: string | null;

  @Field(() => String, { nullable: true })
  whatsappTemplateName?: string | null;

  @Field(() => String, { nullable: true })
  variableMapping?: string | null;
}

