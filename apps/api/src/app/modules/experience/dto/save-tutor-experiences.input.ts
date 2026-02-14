import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { EmploymentType } from '../enums/employment-type.enum';
import { YearsOfExperienceEnum } from '../../tutor/enums/years-of-experience.enum';

@InputType()
export class ExperienceInput {
  @Field(() => Int, {
    nullable: true,
    description: 'ID of existing experience to update. Omit for new experience.',
  })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field({ description: 'Job title' })
  @IsString()
  @MaxLength(255)
  jobTitle: string;

  @Field({
    nullable: true,
    description: 'Employer name (not required if self-employed)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  employerName?: string;

  @Field({
    nullable: true,
    description: 'Employer address (not required if self-employed)',
  })
  @IsOptional()
  @IsString()
  employerAddress?: string;

  @Field(() => EmploymentType, { description: 'Type of employment' })
  @IsEnum(EmploymentType)
  employmentType: EmploymentType;

  @Field({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @Field({
    nullable: true,
    description: 'End date (not required if currently working)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Field({
    nullable: true,
    description: 'Whether currently working here (if true, end date not required)',
    defaultValue: false,
  })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @Field(() => Int, {
    nullable: true,
    description: 'Display order for UI',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

@InputType()
export class SaveTutorExperiencesInput {
  @Field(() => [ExperienceInput], {
    description: 'Full list of experiences (replaces existing)',
  })
  experiences: ExperienceInput[];

  @Field(() => YearsOfExperienceEnum, {
    description: 'Years of teaching/work experience',
  })
  @IsEnum(YearsOfExperienceEnum)
  yearsOfExperience: YearsOfExperienceEnum;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'When true, advances certification stage to offerings. Set false for per-entry saves.',
  })
  @IsOptional()
  advanceToNextStep?: boolean;
}
