import { InputType, Field, Int } from '@nestjs/graphql';
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class ProficiencyTestAnswerInput {
  @Field(() => Int, { description: 'Question ID' })
  @IsInt()
  @Min(1)
  questionId: number;

  @Field(() => Int, { description: 'Selected answer ID' })
  @IsInt()
  @Min(1)
  answerId: number;
}

@InputType()
export class SubmitProficiencyTestInput {
  @Field(() => Int, {
    description: 'Tutor offering ID (the offering being tested)',
  })
  @IsInt()
  @Min(1)
  tutorOfferingId: number;

  @Field(() => [ProficiencyTestAnswerInput], {
    description: 'Answers: questionId and selected answerId for each question',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProficiencyTestAnswerInput)
  answers: ProficiencyTestAnswerInput[];
}
