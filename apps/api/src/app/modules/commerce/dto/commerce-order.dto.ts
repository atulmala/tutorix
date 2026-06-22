import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  OrderPaymentMethodEnum,
  OrderPayerRoleEnum,
  OrderSourceEnum,
  OrderStatusEnum,
} from '../enums/commerce.enums';
import { OrderItemDto } from './order-item.dto';

@ObjectType()
export class CommerceOrderDto {
  @Field(() => Int)
  id: number;

  @Field()
  orderNumber: string;

  @Field(() => OrderStatusEnum)
  status: OrderStatusEnum;

  @Field(() => Int)
  subtotalInr: number;

  @Field(() => Int)
  discountInr: number;

  @Field(() => Int)
  taxInr: number;

  @Field(() => Int)
  amountDueInr: number;

  @Field(() => Int)
  amountPaidInr: number;

  @Field(() => OrderPaymentMethodEnum, { nullable: true })
  paymentMethod?: OrderPaymentMethodEnum;

  @Field(() => OrderPayerRoleEnum)
  payerRole: OrderPayerRoleEnum;

  @Field(() => OrderSourceEnum)
  source: OrderSourceEnum;

  @Field({ nullable: true })
  paidAt?: Date;

  @Field(() => [OrderItemDto], { nullable: true })
  items?: OrderItemDto[];
}
