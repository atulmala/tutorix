import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@InputType()
export class TutorPayoutMonthInput {
  @Field(() => Int, { description: 'IST calendar year' })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  @Field(() => Int, { description: 'IST calendar month (1–12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}