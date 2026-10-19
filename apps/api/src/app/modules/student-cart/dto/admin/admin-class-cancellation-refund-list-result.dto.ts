import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AdminClassCancellationRefundListItem } from './admin-class-cancellation-refund-list-item.dto';

@ObjectType()
export class AdminClassCancellationRefundListResult {
  @Field(() => [AdminClassCancellationRefundListItem])
  items!: AdminClassCancellationRefundListItem[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;
}
