import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AdminOrderListItem } from './admin-order-list-item.dto';

@ObjectType()
export class AdminOrderListResult {
  @Field(() => [AdminOrderListItem])
  items: AdminOrderListItem[];

  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;

  @Field(() => Int)
  totalPages: number;
}
