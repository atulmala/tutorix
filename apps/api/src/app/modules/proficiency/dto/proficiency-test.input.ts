import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ProficiencyTestInput {
  @Field(() => Int, { description: 'Tutor ID the test belongs to' })
  tutorId: number;

  @Field({ description: 'Name or code of the proficiency test' })
  testName: string;

  @Field({ nullable: true, description: 'Optional description of the test' })
  description?: string;

  @Field({ description: 'Score or result of the test' })
  score: string;

  @Field({ nullable: true, description: 'Date when the test was taken' })
  takenAt?: Date;
}

