import { Field, Int, ObjectType } from '@nestjs/graphql';

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
}
