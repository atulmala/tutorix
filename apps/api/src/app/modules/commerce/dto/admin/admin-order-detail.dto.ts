import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  OrderPayerRoleEnum,
  OrderPaymentMethodEnum,
  OrderSourceEnum,
  OrderStatusEnum,
} from '../../enums/commerce.enums';
import { OrderItemDto } from '../order-item.dto';
import { InvoiceSummaryDto } from '../invoice-summary.dto';
import { PaymentAttemptEntity } from '../../entities/payment-attempt.entity';
import { AdminOrderPayer } from './admin-order-payer.dto';

@ObjectType()
export class AdminOrderDetail {
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
  subtotalInr: number;

  @Field(() => Int)
  discountInr: number;

  @Field(() => Int)
  taxInr: number;

  @Field(() => Int)
  pointsRedeemed: number;

  @Field(() => Int)
  pointsValueInr: number;

  @Field(() => Int)
  amountDueInr: number;

  @Field(() => Int)
  amountPaidInr: number;

  @Field({ nullable: true })
  billingName?: string;

  @Field({ nullable: true })
  billingEmail?: string;

  @Field({ nullable: true })
  billingPhone?: string;

  @Field({ nullable: true })
  billingStateCode?: string;

  @Field({ nullable: true })
  paidAt?: Date;

  @Field()
  createdDate: Date;

  @Field(() => AdminOrderPayer)
  payer: AdminOrderPayer;

  @Field(() => [OrderItemDto])
  items: OrderItemDto[];

  @Field(() => InvoiceSummaryDto, { nullable: true })
  invoice?: InvoiceSummaryDto;

  @Field(() => [PaymentAttemptEntity])
  paymentAttempts: PaymentAttemptEntity[];
}
