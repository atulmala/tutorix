import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import {
  TutorBookingConclusionStatus,
  TutorBookingSchedulingStatus,
} from '../enums/tutor-booking-status.enum';

@InputType()
export class StudentClassBookingListInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  tutorId?: number;

  @Field({ nullable: true, description: 'Exact offering label from the subject dropdown' })
  @IsOptional()
  @IsString()
  offeringLabel?: string;

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

@ObjectType()
export class StudentClassBookingTutorOption {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;
}

@ObjectType()
export class StudentClassBookingRow {
  @Field(() => Int)
  orderItemId!: number;

  @Field(() => Date)
  bookedAt!: Date;

  @Field(() => Int)
  tutorId!: number;

  @Field()
  tutorName!: string;

  @Field()
  offeringLabel!: string;

  @Field(() => Int)
  classCount!: number;

  @Field(() => ClassSessionDeliveryModeEnum)
  deliveryMode!: ClassSessionDeliveryModeEnum;

  @Field(() => TutorBookingSchedulingStatus)
  schedulingStatus!: TutorBookingSchedulingStatus;

  @Field(() => TutorBookingConclusionStatus, { nullable: true })
  conclusionStatus!: TutorBookingConclusionStatus | null;

  @Field(() => Int)
  scheduledCount!: number;

  @Field(() => Int)
  unscheduledCount!: number;

  @Field(() => Int)
  cancelledCount!: number;

  @Field(() => Int)
  concludedCount!: number;

  @Field(() => Int)
  linePaidInr!: number;

  @Field()
  isDemo!: boolean;
}

@ObjectType()
export class StudentClassBookingListResult {
  @Field(() => [StudentClassBookingRow])
  items!: StudentClassBookingRow[];

  @Field(() => [StudentClassBookingTutorOption])
  tutors!: StudentClassBookingTutorOption[];

  @Field(() => [String])
  subjects!: string[];

  @Field(() => Int)
  totalCount!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;
}
