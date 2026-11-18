import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PaymentGatewayProviderEnum } from '../../../payment/enums/payment.enums';

@ObjectType()
export class TutorPayoutPeriodTotals {
  @Field()
  startDate!: string;

  @Field()
  endDate!: string;

  @Field(() => Int, { description: 'Concluded classes counted in this period' })
  concludedClassCount!: number;

  @Field(() => Int)
  totalGrossInr!: number;

  @Field(() => Int)
  totalDeductionsInr!: number;

  @Field(() => Int)
  totalNetPayoutInr!: number;
}

@ObjectType()
export class TutorMonthlyEarningsBucket {
  @Field(() => Int)
  concludedClassCount!: number;

  @Field(() => Int)
  totalNetPayoutInr!: number;
}

@ObjectType()
export class MyTutorMonthlyEarnings {
  @Field()
  monthLabel!: string;

  @Field()
  startDate!: string;

  @Field()
  endDate!: string;

  @Field(() => Int)
  settlementDayOfMonth!: number;

  @Field()
  settlementNote!: string;

  @Field(() => TutorMonthlyEarningsBucket, {
    description: 'Undisputed classes eligible for the next settlement run',
  })
  payable!: TutorMonthlyEarningsBucket;

  @Field(() => TutorMonthlyEarningsBucket, {
    nullable: true,
    description: 'Current month only: concluded but still inside the student dispute window',
  })
  inDisputeWindow!: TutorMonthlyEarningsBucket | null;

  @Field(() => TutorMonthlyEarningsBucket, {
    description: 'Classes with a pending or approved post-class refund claim',
  })
  underDispute!: TutorMonthlyEarningsBucket;

  @Field(() => TutorMonthlyEarningsBucket, {
    description: 'Earlier months: eligible now and expected in the next payout',
  })
  carriedForward!: TutorMonthlyEarningsBucket;
}

@ObjectType()
export class MyTutorEarningsSummary {
  @Field(() => Boolean)
  bankDetailsComplete!: boolean;

  @Field(() => Int)
  year!: number;

  @Field(() => Int)
  month!: number;

  @Field(() => TutorMonthlyEarningsBucket)
  payable!: TutorMonthlyEarningsBucket;

  @Field(() => TutorMonthlyEarningsBucket, {
    nullable: true,
    description: 'Deferred from earlier months or under dispute (summary card)',
  })
  deferred!: TutorMonthlyEarningsBucket | null;

  @Field(() => String, { nullable: true })
  deferredNote!: string | null;
}

@ObjectType()
export class TutorPayoutLineItem {
  @Field(() => Int)
  orderItemId!: number;

  @Field()
  studentName!: string;

  @Field(() => Int)
  classesInBooking!: number;

  @Field(() => Int)
  rateInr!: number;

  @Field(() => Int)
  concludedInRange!: number;

  @Field(() => Int)
  grossInr!: number;

  @Field(() => Int)
  commissionPercent!: number;

  @Field(() => Int)
  commissionInr!: number;

  @Field(() => Int)
  onlineChargesInr!: number;

  @Field(() => PaymentGatewayProviderEnum)
  paymentGatewayProvider!: PaymentGatewayProviderEnum;

  @Field(() => Int)
  paymentGatewayFeeInr!: number;

  @Field(() => Int)
  paymentGatewayGstInr!: number;

  @Field(() => Int)
  paymentGatewayChargesInr!: number;

  @Field(() => Int)
  totalDeductionsInr!: number;

  @Field(() => Int)
  netPayoutInr!: number;
}

@ObjectType()
export class MyTutorPayoutPeriodDetail {
  @Field()
  startDate!: string;

  @Field()
  endDate!: string;

  @Field(() => [TutorPayoutLineItem])
  items!: TutorPayoutLineItem[];

  @Field(() => Int)
  totalGrossInr!: number;

  @Field(() => Int)
  totalCommissionInr!: number;

  @Field(() => Int)
  totalOnlineChargesInr!: number;

  @Field(() => Int)
  totalPaymentGatewayFeeInr!: number;

  @Field(() => Int)
  totalPaymentGatewayGstInr!: number;

  @Field(() => Int)
  totalPaymentGatewayChargesInr!: number;

  @Field(() => Int)
  totalDeductionsInr!: number;

  @Field(() => Int)
  totalNetPayoutInr!: number;
}

@ObjectType()
export class TutorPayoutTransfer {
  @Field(() => Int)
  id!: number;

  @Field()
  paidAt!: Date;

  @Field(() => Int)
  amountInr!: number;

  @Field(() => String, { nullable: true })
  bankAccountLast4?: string | null;

  @Field(() => String, { nullable: true })
  utrReference?: string | null;
}