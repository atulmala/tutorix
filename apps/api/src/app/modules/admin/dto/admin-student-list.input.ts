import { Field, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { StudentOnboardingStageEnum } from '../../student/enums/student.enums';

@InputType()
export class AdminStudentListInput {
  @Field(() => StudentOnboardingStageEnum, { nullable: true })
  @IsOptional()
  @IsEnum(StudentOnboardingStageEnum)
  onboardingStage?: StudentOnboardingStageEnum;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  completedOnly?: boolean;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  pageSize?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}
