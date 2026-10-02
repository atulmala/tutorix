import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import {
  TutorBookingConclusionStatus,
  TutorBookingSchedulingStatus,
} from '../enums/tutor-booking-status.enum';

@ObjectType()
export class TutorClassBookingRow {
  @Field(() => Int)
  orderItemId!: number;

  @Field(() => Date)
  bookedAt!: Date;

  @Field()
  studentName!: string;

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
export class TutorClassBookingListResult {
  @Field(() => [TutorClassBookingRow])
  items!: TutorClassBookingRow[];

  @Field(() => Int)
  totalCount!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;
}
