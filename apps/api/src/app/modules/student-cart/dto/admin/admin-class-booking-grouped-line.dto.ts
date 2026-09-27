import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ClassSessionDeliveryModeEnum } from '../../../tutor-class-session/enums/class-session-delivery-mode.enum';

@ObjectType()
export class AdminClassBookingGroupedLine {
  @Field(() => Int)
  tutorId!: number;

  @Field()
  tutorName!: string;

  @Field()
  offeringLabel!: string;

  @Field(() => ClassSessionDeliveryModeEnum)
  deliveryMode!: ClassSessionDeliveryModeEnum;

  @Field(() => Int)
  classCount!: number;

  @Field(() => Int)
  scheduledCount!: number;

  @Field(() => Int)
  unscheduledCount!: number;

  @Field(() => Int)
  cancelledCount!: number;

  @Field(() => Int)
  unitRateInr!: number;

  @Field(() => Int)
  linePaidInr!: number;
}
