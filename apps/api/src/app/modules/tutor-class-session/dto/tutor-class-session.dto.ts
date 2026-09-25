import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { ClassSessionDeliveryModeEnum } from '../enums/class-session-delivery-mode.enum';
import { ClassSessionStatusEnum } from '../enums/class-session-status.enum';

@ObjectType()
export class TutorBookableSlot {
  @Field(() => ID)
  tutorCalendarId!: number;

  @Field()
  startsAt!: Date;

  @Field(() => Int)
  seatsLeft!: number;

  @Field(() => Int)
  batchSize!: number;
}

@ObjectType()
export class BookTutorClassResult {
  @Field(() => ID)
  sessionId!: number;

  @Field(() => ID)
  enrollmentId!: number;

  @Field(() => Int)
  seatsLeft!: number;

  @Field(() => ClassSessionStatusEnum)
  status!: ClassSessionStatusEnum;
}

@ObjectType()
export class StudentBookedClassSession {
  @Field(() => ID)
  enrollmentId!: number;

  @Field(() => ID)
  sessionId!: number;

  @Field(() => ID)
  tutorCalendarId!: number;

  @Field()
  startsAt!: Date;

  @Field(() => Int)
  durationMinutes!: number;

  @Field(() => ClassSessionDeliveryModeEnum)
  deliveryMode!: ClassSessionDeliveryModeEnum;

  @Field()
  offeringLabel!: string;

  @Field()
  tutorName!: string;
}
