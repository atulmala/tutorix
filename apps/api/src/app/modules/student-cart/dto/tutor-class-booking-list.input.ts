import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  TutorBookingConclusionStatus,
  TutorBookingSchedulingStatus,
} from '../enums/tutor-booking-status.enum';

@InputType()
export class TutorClassBookingListInput {
  @Field({ nullable: true, description: 'Match student login email or mobile' })
  @IsOptional()
  @IsString()
  studentSearch?: string;

  @Field({ nullable: true, description: 'Match offering display name' })
  @IsOptional()
  @IsString()
  offeringSearch?: string;

  @Field(() => TutorBookingSchedulingStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TutorBookingSchedulingStatus)
  schedulingStatus?: TutorBookingSchedulingStatus;

  @Field(() => TutorBookingConclusionStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TutorBookingConclusionStatus)
  conclusionStatus?: TutorBookingConclusionStatus;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  pageSize?: number;
}
