import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TutorCertificationStageEnum } from '../../tutor/enums/tutor.enums';

@ObjectType()
export class AdminTutorListItem {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  mobile?: string;

  @Field({ nullable: true })
  mobileCountryCode?: string;

  @Field({ nullable: true })
  mobileNumber?: string;

  @Field(() => TutorCertificationStageEnum, { nullable: true })
  certificationStage?: TutorCertificationStageEnum;

  @Field(() => Int, { description: 'Whole days since entering the current stage' })
  daysInStage: number;

  @Field(() => Boolean, {
    description:
      'True when any onboarding document has PENDING_HUMAN screening (awaiting admin review)',
  })
  pendingAdminDocumentReview: boolean;

  @Field(() => Boolean, {
    description: 'True when this tutor is marked as a test account for fast-track onboarding',
  })
  testTutor: boolean;
}
