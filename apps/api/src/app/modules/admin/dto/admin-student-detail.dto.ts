import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AddressEntity } from '../../address/entities/address.entity';
import {
  ParentRelationEnum,
  SchoolBoardEnum,
  StudentOnboardingStageEnum,
  StudentTypeEnum,
} from '../../student/enums/student.enums';
import { AdminStudentDetailUser } from './admin-student-detail-user.dto';

@ObjectType()
export class AdminStudentDetail {
  @Field(() => Int)
  id: number;

  @Field(() => StudentOnboardingStageEnum, { nullable: true })
  onboardingStage?: StudentOnboardingStageEnum;

  @Field(() => Date, { nullable: true })
  onboardingStageEnteredAt?: Date;

  @Field()
  onBoardingComplete: boolean;

  @Field(() => ParentRelationEnum, { nullable: true })
  parentRelation?: ParentRelationEnum;

  @Field({ nullable: true })
  parentName?: string;

  @Field(() => StudentTypeEnum, { nullable: true })
  studentType?: StudentTypeEnum;

  @Field(() => Int, { nullable: true })
  schoolClass?: number;

  @Field(() => SchoolBoardEnum, { nullable: true })
  board?: SchoolBoardEnum;

  @Field({ nullable: true })
  boardOther?: string;

  @Field(() => AdminStudentDetailUser, { nullable: true })
  user?: AdminStudentDetailUser;

  @Field(() => [AddressEntity])
  addresses: AddressEntity[];
}
