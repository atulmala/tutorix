import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TutorCertificationStageEnum } from '../../tutor/enums/tutor.enums';

@ObjectType()
export class AdminTutorStageCount {
  @Field(() => TutorCertificationStageEnum)
  stage: TutorCertificationStageEnum;

  @Field(() => Int)
  count: number;

  @Field(() => Int, {
    nullable: true,
    description:
      'Tutors at docs stage with onboarding documents awaiting admin review (docs stage only)',
  })
  pendingDocumentReviewCount?: number;
}
