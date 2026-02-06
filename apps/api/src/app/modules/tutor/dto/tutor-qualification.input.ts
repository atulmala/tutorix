import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { EducationalQualification } from '../enums/educational-qualification.enum';
import { GradeType } from '../enums/grade-type.enum';

@InputType()
export class TutorQualificationInput {
  @Field(() => EducationalQualification, {
    description: 'Educational qualification level',
  })
  @IsEnum(EducationalQualification)
  qualificationType: EducationalQualification;

  @Field({ description: 'Board or university name' })
  @IsString()
  @MaxLength(255)
  boardOrUniversity: string;

  @Field(() => GradeType, {
    description: 'Grade type: CGPA, Percentage, or Division',
  })
  @IsEnum(GradeType)
  gradeType: GradeType;

  @Field({ description: 'Grade value (e.g. "8.5", "85", "First Division")' })
  @IsString()
  @MaxLength(50)
  gradeValue: string;

  @Field({
    nullable: true,
    description: 'Degree name (e.g. Higher Secondary, BA, BSc, MSc)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  degreeName?: string;

  @Field(() => Int, { description: 'Year of obtaining the qualification' })
  @IsInt()
  @Min(1950)
  @Max(2100)
  yearObtained: number;

  @Field({ nullable: true, description: 'Field of study (e.g. Science, Mathematics)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fieldOfStudy?: string;

  @Field(() => Int, { nullable: true, description: 'Display order for UI' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

@InputType()
export class SaveTutorQualificationsInput {
  @Field(() => [TutorQualificationInput], {
    description: 'Full list of qualifications (replaces existing)',
  })
  qualifications: TutorQualificationInput[];
}
