import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TutorOfferingPtFeeStatusEnum } from '../enums/tutor-offering-pt-fee-status.enum';

@ObjectType()
export class ProficiencyTestFeeInfo {
  @Field(() => Int)
  listPriceInr: number;

  @Field(() => Int)
  amountDueInr: number;

  @Field()
  collectionEnabled: boolean;

  @Field(() => TutorOfferingPtFeeStatusEnum)
  paymentStatus: TutorOfferingPtFeeStatusEnum;

  @Field()
  displayLabel: string;
}
