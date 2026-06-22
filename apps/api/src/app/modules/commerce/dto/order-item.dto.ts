import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import {
  OrderItemFulfillmentStatusEnum,
  OrderItemReferenceTypeEnum,
  OrderItemTypeEnum,
} from '../enums/commerce.enums';

@ObjectType()
export class OrderItemDto {
  @Field(() => Int)
  id: number;

  @Field(() => OrderItemTypeEnum)
  itemType: OrderItemTypeEnum;

  @Field()
  description: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Int)
  unitRateInr: number;

  @Field(() => Int)
  lineSubtotalInr: number;

  @Field(() => Int)
  discountInr: number;

  @Field()
  waiverApplied: boolean;

  @Field(() => Int)
  cgstInr: number;

  @Field(() => Int)
  sgstInr: number;

  @Field(() => Int)
  igstInr: number;

  @Field(() => Float)
  gstRatePercent: number;

  @Field(() => OrderItemReferenceTypeEnum)
  referenceType: OrderItemReferenceTypeEnum;

  @Field(() => Int)
  referenceId: number;

  @Field(() => OrderItemFulfillmentStatusEnum)
  fulfillmentStatus: OrderItemFulfillmentStatusEnum;
}
