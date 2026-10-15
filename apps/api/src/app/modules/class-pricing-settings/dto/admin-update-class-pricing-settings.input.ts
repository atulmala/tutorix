import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@InputType()
export class AdminUpdateClassPricingSettingsInput {
  @Field(() => Int)
  @IsInt()
  @Min(0)
  minimumOnlinePricePerClassInr!: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  minimumOfflinePricePerClassInr!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  commissionSlabThresholdInr!: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100)
  tutorCommissionPercentUpToSlab!: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100)
  tutorCommissionPercentAboveSlab!: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  platformFeePerParticipantInr!: number;
}
