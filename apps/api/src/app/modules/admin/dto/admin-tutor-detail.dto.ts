import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AddressEntity } from '../../address/entities/address.entity';
import { ExperienceEntity } from '../../experience/entities/experience.entity';
import { TutorQualificationEntity } from '../../tutor/entities/tutor-qualification.entity';
import { TutorCertificationStageEnum } from '../../tutor/enums/tutor.enums';
import { YearsOfExperienceEnum } from '../../tutor/enums/years-of-experience.enum';
import { AdminTutorDetailUser } from './admin-tutor-detail-user.dto';
import { AdminTutorDocumentDetail } from './admin-tutor-document-detail.dto';
import { AdminTutorOfferingDetail } from './admin-tutor-offering-detail.dto';

@ObjectType()
export class AdminTutorDetail {
  @Field(() => Int)
  id: number;

  @Field(() => TutorCertificationStageEnum, { nullable: true })
  certificationStage?: TutorCertificationStageEnum;

  @Field(() => YearsOfExperienceEnum)
  yearsOfExperience: YearsOfExperienceEnum;

  @Field()
  regFeePaid: boolean;

  @Field()
  testTutor: boolean;

  @Field()
  canSetAvailability: boolean;

  @Field({ nullable: true })
  availabilityConfiguredAt?: Date;

  @Field({ nullable: true })
  regFeeAmount?: number;

  @Field({ nullable: true })
  regFeeAmountToBePaid?: number;

  @Field({ nullable: true })
  regFeeDate?: Date;

  @Field(() => AdminTutorDetailUser, { nullable: true })
  user?: AdminTutorDetailUser;

  @Field(() => [AddressEntity])
  addresses: AddressEntity[];

  @Field(() => [TutorQualificationEntity])
  qualifications: TutorQualificationEntity[];

  @Field(() => [ExperienceEntity])
  experiences: ExperienceEntity[];

  @Field(() => [AdminTutorOfferingDetail])
  offerings: AdminTutorOfferingDetail[];

  @Field(() => [AdminTutorDocumentDetail])
  documents: AdminTutorDocumentDetail[];
}
