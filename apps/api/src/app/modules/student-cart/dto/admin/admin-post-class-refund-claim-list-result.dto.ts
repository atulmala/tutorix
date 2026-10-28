import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AdminPostClassRefundClaimListItem } from './admin-post-class-refund-claim-list-item.dto';

@ObjectType()
export class AdminPostClassRefundClaimListResult {
  @Field(() => [AdminPostClassRefundClaimListItem])
  items!: AdminPostClassRefundClaimListItem[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;
}
