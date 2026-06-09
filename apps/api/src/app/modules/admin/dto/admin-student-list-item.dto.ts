import { Field, Int, ObjectType } from '@nestjs/graphql';
import { StudentOnboardingStageEnum } from '../../student/enums/student.enums';

@ObjectType()
export class AdminStudentListItem {
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

  @Field(() => StudentOnboardingStageEnum, { nullable: true })
  onboardingStage?: StudentOnboardingStageEnum;

  @Field()
  onBoardingComplete: boolean;

  @Field(() => Int, { description: 'Whole days since entering the current stage' })
  daysInStage: number;
}
