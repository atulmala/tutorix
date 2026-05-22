import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TutorCertificationStageEnum } from '../../tutor/enums/tutor.enums';

@ObjectType()
export class AdminTutorStageCount {
  @Field(() => TutorCertificationStageEnum)
  stage: TutorCertificationStageEnum;

  @Field(() => Int)
  count: number;
}
