import { Field, ObjectType } from '@nestjs/graphql';
import { TutorOfferingEntity } from '../entities/tutor-offering.entity';
import { ProficiencyTestFeeInfo } from './proficiency-test-fee-info.dto';

@ObjectType()
export class AddTutorOfferingResult {
  @Field(() => TutorOfferingEntity)
  tutorOffering: TutorOfferingEntity;

  @Field(() => ProficiencyTestFeeInfo)
  ptFee: ProficiencyTestFeeInfo;
}
