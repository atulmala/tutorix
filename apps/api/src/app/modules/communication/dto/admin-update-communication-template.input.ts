import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CommunicationAudience } from '../enums/communication-audience.enum';
import { CommunicationChannel } from '../enums/communication-channel.enum';
import { CommunicationEvent } from '../enums/communication-event.enum';

@InputType()
export class AdminUpdateCommunicationTemplateInput {
  @Field(() => CommunicationEvent)
  @IsEnum(CommunicationEvent)
  event: CommunicationEvent;

  @Field(() => CommunicationAudience)
  @IsEnum(CommunicationAudience)
  audience: CommunicationAudience;

  @Field(() => CommunicationChannel)
  @IsEnum(CommunicationChannel)
  channel: CommunicationChannel;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @Field()
  @IsString()
  @MaxLength(20000)
  body: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dltTemplateId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dltEntityId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dltHeader?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  whatsappTemplateName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  variableMapping?: string;
}
