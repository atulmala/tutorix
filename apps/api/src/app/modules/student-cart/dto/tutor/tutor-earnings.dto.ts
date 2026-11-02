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
export class MyTutorEarningsSummary {
  @Field(() => Boolean)
  bankDetailsComplete!: boolean;

  @Field(() => TutorPayoutPeriodTotals, {
    description: 'Estimated net for the default next bank transfer period',
  })
  nextPayout!: TutorPayoutPeriodTotals;

  @Field(() => TutorPayoutPeriodTotals, {
    nullable: true,
    description: 'Classes still in the post-class hold window before the next period',
  })
  inHold!: TutorPayoutPeriodTotals | null;
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
