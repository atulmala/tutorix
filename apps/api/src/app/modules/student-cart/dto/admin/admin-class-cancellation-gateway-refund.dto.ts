import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PaymentGatewayProviderEnum } from '../../../payment/enums/payment.enums';

@ObjectType()
export class AdminClassCancellationGatewayRefund {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  paymentAttemptId!: number;

  @Field()
  gatewayPaymentId!: string;

  @Field()
  gatewayRefundId!: string;

  @Field(() => Int)
  amountInr!: number;

  @Field()
  simulated!: boolean;

  @Field(() => String, { nullable: true })
  razorpayRefundStatus?: string | null;

  @Field(() => PaymentGatewayProviderEnum, { nullable: true })
  provider?: PaymentGatewayProviderEnum | null;

  @Field(() => String, { nullable: true })
  cashfreeRefundStatus?: string | null;
}
