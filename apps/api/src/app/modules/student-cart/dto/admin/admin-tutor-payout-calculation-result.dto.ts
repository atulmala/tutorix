import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminTutorPayoutCalculationRow {
  @Field(() => Int)
  orderItemId!: number;

  @Field()
  tutorName!: string;

  @Field()
  studentName!: string;

  @Field(() => Int, { description: 'Classes purchased on this order line' })
  classesInBooking!: number;

  @Field(() => Int, { description: 'Student-paid amount per class (INR)' })
  rateInr!: number;

  @Field(() => Int, { description: 'Concluded scheduled classes ending in the selected range' })
  concludedInRange!: number;

  @Field(() => Int, { description: 'Concluded classes × booked rate (INR)' })
  grossInr!: number;

  @Field(() => Int)
  commissionPercent!: number;

  @Field(() => Int)
  commissionInr!: number;

  @Field(() => Int)
  onlineChargesInr!: number;

  @Field(() => Int, { description: 'Commission plus online charges' })
  totalDeductionsInr!: number;

  @Field(() => Int)
  netPayoutInr!: number;
}

@ObjectType()
export class AdminTutorPayoutCalculationResult {
  @Field(() => [AdminTutorPayoutCalculationRow])
  items!: AdminTutorPayoutCalculationRow[];

  @Field(() => Int)
  totalCount!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Int, { description: 'Sum of gross across all matching rows' })
  totalGrossInr!: number;

  @Field(() => Int)
  totalCommissionInr!: number;

  @Field(() => Int)
  totalOnlineChargesInr!: number;

  @Field(() => Int)
  totalDeductionsInr!: number;

  @Field(() => Int)
  totalNetPayoutInr!: number;
}
