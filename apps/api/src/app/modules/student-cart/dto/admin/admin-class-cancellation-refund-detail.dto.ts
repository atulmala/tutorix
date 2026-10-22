import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { ClassCancellationRefundAiStatusEnum } from '../../enums/class-cancellation-refund-ai-status.enum';
import { ClassCancellationRefundInitiatedByEnum } from '../../enums/class-cancellation-refund-initiated-by.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../../enums/class-cancellation-refund-payout-status.enum';
import { ClassCreditRefundMethodEnum } from '../../enums/class-credit-refund-method.enum';
import { AdminClassCancellationGatewayRefund } from './admin-class-cancellation-gateway-refund.dto';

@ObjectType()
export class AdminClassCancellationRefundDetail {
  @Field(() => Int)
  id!: number;

  @Field(() => ClassCancellationRefundInitiatedByEnum)
  initiatedBy!: ClassCancellationRefundInitiatedByEnum;

  @Field(() => Int)
  studentId!: number;

  @Field()
  studentName!: string;

  @Field(() => Int, { nullable: true })
  tutorId?: number | null;

  @Field()
  tutorName!: string;

  @Field()
  offeringLabel!: string;

  @Field(() => Int)
  classCount!: number;

  @Field(() => Int)
  amountInr!: number;

  @Field(() => ClassCreditRefundMethodEnum)
  refundMethod!: ClassCreditRefundMethodEnum;

  @Field(() => ClassCancellationRefundPayoutStatusEnum)
  payoutStatus!: ClassCancellationRefundPayoutStatusEnum;

  @Field(() => ClassCancellationRefundAiStatusEnum)
  aiStatus!: ClassCancellationRefundAiStatusEnum;

  @Field(() => String, { nullable: true })
  aiRejectionReason?: string | null;

  @Field(() => String, { nullable: true })
  aiSummary?: string | null;

  @Field(() => Float, { nullable: true })
  aiConfidence?: number | null;

  @Field(() => String, { nullable: true })
  breakdownText?: string | null;

  @Field(() => String, { nullable: true })
  aiChecksJson?: string | null;

  @Field(() => [Int])
  creditIds!: number[];

  @Field(() => Int, { nullable: true })
  orderId?: number | null;

  @Field(() => Int, { nullable: true })
  orderItemId?: number | null;

  @Field(() => String, { nullable: true })
  failureReason?: string | null;

  @Field(() => Date)
  initiatedAt!: Date;

  @Field(() => Date, { nullable: true })
  processedAt?: Date | null;

  @Field(() => Int, { nullable: true })
  walletTransactionId?: number | null;

  @Field(() => [AdminClassCancellationGatewayRefund])
  gatewayRefunds!: AdminClassCancellationGatewayRefund[];

  @Field(() => String, { nullable: true })
  gatewayPayoutNote?: string | null;
}
