import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class SubmitProficiencyTestResult {
  @Field()
  passed: boolean;

  @Field(() => Int)
  score: number;

  @Field(() => Int)
  maxScore: number;

  @Field(() => Int)
  attemptsUsed: number;

  @Field(() => Int, { nullable: true })
  passPercentage?: number;

  @Field(() => Int, {
    description: 'Tutor offering ID (client can refetch tutorOfferings)',
  })
  tutorOfferingId: number;
}
