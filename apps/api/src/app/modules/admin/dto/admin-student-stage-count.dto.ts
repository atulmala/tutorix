import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminStudentStageCount {
  @Field({
    description:
      'Onboarding stage id: parent, address, education, or complete for finished students',
  })
  stage: string;

  @Field(() => Int)
  count: number;
}
