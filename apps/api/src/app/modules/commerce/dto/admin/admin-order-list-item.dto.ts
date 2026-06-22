import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  OrderPayerRoleEnum,
  OrderPaymentMethodEnum,
  OrderSourceEnum,
  OrderStatusEnum,
} from '../../enums/commerce.enums';

@ObjectType()
export class AdminOrderListItem {
  @Field(() => Int)
  id: number;

  @Field()
  orderNumber: string;

  @Field(() => OrderStatusEnum)
  status: OrderStatusEnum;

  @Field(() => OrderPaymentMethodEnum, { nullable: true })
  paymentMethod?: OrderPaymentMethodEnum;

  @Field(() => OrderPayerRoleEnum)
  payerRole: OrderPayerRoleEnum;

  @Field(() => OrderSourceEnum)
  source: OrderSourceEnum;

  @Field(() => Int)
  userId: number;

  @Field({ nullable: true })
  payerName?: string;

  @Field({ nullable: true })
  payerEmail?: string;

  @Field(() => Int)
  subtotalInr: number;

  @Field(() => Int)
  discountInr: number;

  @Field(() => Int)
  amountDueInr: number;

  @Field(() => Int)
  amountPaidInr: number;

  @Field({ nullable: true })
  paidAt?: Date;

  @Field()
  createdDate: Date;
}
