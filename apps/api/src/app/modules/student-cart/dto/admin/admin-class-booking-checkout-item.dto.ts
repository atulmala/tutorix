import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AdminClassBookingGroupedLine } from './admin-class-booking-grouped-line.dto';

@ObjectType()
export class AdminClassBookingCheckoutItem {
  @Field(() => Int)
  orderId!: number;

  @Field()
  orderNumber!: string;

  @Field(() => Int)
  studentId!: number;

  @Field()
  studentName!: string;

  @Field({ nullable: true })
  studentEmail?: string;

  @Field(() => Date)
  purchasedAt!: Date;

  @Field(() => Int)
  classCount!: number;

  @Field(() => Int)
  tutorCount!: number;

  @Field(() => Int)
  amountDueInr!: number;

  @Field(() => Int)
  amountPaidInr!: number;

  @Field(() => [AdminClassBookingGroupedLine])
  lines!: AdminClassBookingGroupedLine[];
}
