import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AdminClassBookingCheckoutItem } from './admin-class-booking-checkout-item.dto';

@ObjectType()
export class AdminClassBookingListResult {
  @Field(() => [AdminClassBookingCheckoutItem])
  items!: AdminClassBookingCheckoutItem[];

  @Field(() => Int)
  totalCount!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;
}
