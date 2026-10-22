import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ClassCancellationRefundAiStatusEnum } from '../../enums/class-cancellation-refund-ai-status.enum';
import { ClassCancellationRefundInitiatedByEnum } from '../../enums/class-cancellation-refund-initiated-by.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../../enums/class-cancellation-refund-payout-status.enum';
import { ClassCreditRefundMethodEnum } from '../../enums/class-credit-refund-method.enum';

@ObjectType()
export class AdminClassCancellationRefundListItem {
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

  @Field(() => Date)
  initiatedAt!: Date;

  @Field(() => Int, { nullable: true })
  orderId?: number | null;
}
