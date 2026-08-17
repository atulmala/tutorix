import { Field, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';
import { CommunicationAudience } from '../enums/communication-audience.enum';
import { CommunicationEvent } from '../enums/communication-event.enum';

@InputType()
export class AdminUpdateCommunicationRuleInput {
  @Field(() => CommunicationEvent)
  @IsEnum(CommunicationEvent)
  event: CommunicationEvent;

  @Field(() => CommunicationAudience)
  @IsEnum(CommunicationAudience)
  audience: CommunicationAudience;

  @Field()
  @IsBoolean()
  enabled: boolean;

  @Field()
  @IsBoolean()
  emailEnabled: boolean;

  @Field()
  @IsBoolean()
  smsEnabled: boolean;

  @Field()
  @IsBoolean()
  pushEnabled: boolean;

  @Field()
  @IsBoolean()
  whatsappEnabled: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  offsetMinutes?: number | null;
}
