import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminClassCancellationRefundBatchResult {
  @Field(() => Int)
  resetForReanalysis!: number;

  @Field(() => Int)
  itemsFound!: number;

  @Field(() => Int)
  analyzed!: number;

  @Field(() => Int)
  gatewaySynced!: number;
}
