import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PaymentDisbursementKindEnum } from '../../enums/payment-disbursement-kind.enum';
import { PaymentDisbursementSourceTypeEnum } from '../../enums/payment-disbursement-source-type.enum';
import { PaymentDisbursementStatusEnum } from '../../enums/payment-disbursement-status.enum';

@ObjectType()
export class AdminPaymentDisbursementListItem {
  @Field(() => Int)
  id!: number;

  @Field(() => PaymentDisbursementKindEnum)
  kind!: PaymentDisbursementKindEnum;

  @Field(() => PaymentDisbursementStatusEnum)
  status!: PaymentDisbursementStatusEnum;

  @Field(() => Int)
  payeeUserId!: number;

  @Field()
  payeeName!: string;

  @Field(() => Int)
  amountInr!: number;

  @Field(() => PaymentDisbursementSourceTypeEnum)
  sourceType!: PaymentDisbursementSourceTypeEnum;

  @Field(() => Int)
  sourceId!: number;

  @Field(() => Int, { nullable: true })
  classCancellationRefundRequestId?: number | null;

  @Field(() => Int, { nullable: true })
  tutorId?: number | null;

  @Field(() => String, { nullable: true })
  periodStartDate?: string | null;

  @Field(() => String, { nullable: true })
  periodEndDate?: string | null;

  @Field()
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  failureReason?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Payout provider for tutor payouts; null means RazorpayX',
  })
  payoutProvider?: string | null;
}

@ObjectType()
export class AdminPaymentDisbursementListResult {
  @Field(() => [AdminPaymentDisbursementListItem])
  items!: AdminPaymentDisbursementListItem[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;
}

@ObjectType()
export class AdminPaymentDisbursementGatewayRefund {
  @Field(() => Int)
  id!: number;

  @Field()
  gatewayPaymentId!: string;

  @Field()
  gatewayRefundId!: string;

  @Field(() => Int)
  amountInr!: number;

  @Field(() => String, { nullable: true })
  razorpayRefundStatus?: string | null;

  @Field(() => String, { nullable: true })
  provider?: string | null;

  @Field(() => String, { nullable: true })
  cashfreeRefundStatus?: string | null;
}

@ObjectType()
export class AdminPaymentDisbursementDetail extends AdminPaymentDisbursementListItem {
  @Field(() => Int, { nullable: true })
  orderId?: number | null;

  @Field(() => Int, { nullable: true })
  studentId?: number | null;

  @Field(() => String, { nullable: true })
  refundMethod?: string | null;

  @Field(() => String, { nullable: true })
  refundPayoutStatus?: string | null;

  @Field(() => String, { nullable: true })
  gatewayPayoutId?: string | null;

  @Field(() => String, { nullable: true })
  gatewayUtr?: string | null;

  @Field(() => Int, { nullable: true })
  walletTransactionId?: number | null;

  @Field(() => Date, { nullable: true })
  processedAt?: Date | null;

  @Field(() => [AdminPaymentDisbursementGatewayRefund], { nullable: true })
  gatewayRefunds?: AdminPaymentDisbursementGatewayRefund[] | null;
}

@ObjectType()
export class AdminSubmitTutorPayoutDisbursementsResult {
  @Field(() => Int)
  createdCount!: number;

  @Field(() => Int)
  skippedAlreadySubmitted!: number;

  @Field(() => Int)
  skippedMissingBank!: number;

  @Field(() => Int)
  skippedZeroAmount!: number;
}
