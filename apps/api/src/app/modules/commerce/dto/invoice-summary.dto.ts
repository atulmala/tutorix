import { Field, Int, ObjectType } from '@nestjs/graphql';
import { OrderPaymentMethodEnum } from '../enums/commerce.enums';

@ObjectType()
export class InvoiceSummaryDto {
  @Field(() => Int)
  id: number;

  @Field()
  invoiceNumber: string;

  @Field()
  orderNumber: string;

  @Field(() => Int)
  amountDueInr: number;

  @Field(() => Int)
  amountPaidInr: number;

  @Field(() => OrderPaymentMethodEnum)
  paymentMethod: OrderPaymentMethodEnum;

  @Field()
  issuedAt: Date;

  @Field({ nullable: true })
  pdfUrl?: string;
}
