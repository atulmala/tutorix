import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TutorCertificationStageEnum } from '../../tutor/enums/tutor.enums';

@InputType()
export class AdminTutorListInput {
  @Field(() => TutorCertificationStageEnum, { nullable: true })
  @IsOptional()
  @IsEnum(TutorCertificationStageEnum)
  certificationStage?: TutorCertificationStageEnum;

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

  @Field(() => Int, {
    nullable: true,
    description:
      'When set, return tutors who passed the proficiency test for this offering, across all onboarding stages.',
  })
  @IsOptional()
  @IsInt()
  offeringId?: number;
}
