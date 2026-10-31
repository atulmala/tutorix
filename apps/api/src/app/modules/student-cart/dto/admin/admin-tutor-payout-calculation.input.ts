import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

@InputType()
export class AdminTutorPayoutCalculationInput {
  @Field({ description: 'Inclusive start date (IST calendar), YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @Field({ description: 'Inclusive end date (IST calendar), YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;

  @Field({ nullable: true, description: 'Match tutor name, email, or mobile' })
  @IsOptional()
  @IsString()
  tutorSearch?: string;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
