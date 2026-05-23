import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminProficiencyTestListItem {
  @Field(() => Int)
  id: number;

  @Field()
  studyArea: string;

  @Field()
  board: string;

  @Field({ description: 'Grade, exam title, proficiency level, etc.' })
  classLabel: string;

  @Field()
  subjects: string;

  @Field(() => Int)
  questionCount: number;

  @Field(() => [Int], {
    description: 'Leaf offering IDs linked to this proficiency test',
  })
  offeringIds: number[];
}
