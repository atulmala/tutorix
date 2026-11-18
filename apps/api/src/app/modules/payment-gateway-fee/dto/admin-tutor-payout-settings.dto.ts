import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@ObjectType()
export class AdminTutorPayoutSettingsResult {
  @Field(() => Int, { description: 'IST calendar day for monthly tutor settlement messaging (3–28)' })
  tutorPayoutSettlementDayOfMonth!: number;
}

@InputType()
export class AdminUpdateTutorPayoutSettingsInput {
  @Field(() => Int)
  @IsInt()
  @Min(3)
  @Max(28)
  tutorPayoutSettlementDayOfMonth!: number;
}