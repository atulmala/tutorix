import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PostClassRefundClaimMethodEnum } from '../enums/post-class-refund-claim-method.enum';
import { PostClassRefundClaimReasonEnum } from '../enums/post-class-refund-claim-reason.enum';
import { PostClassRefundClaimStudentStatusEnum } from '../enums/post-class-refund-claim-student-status.enum';
import { PostClassRefundTutorResponseStatusEnum } from '../enums/post-class-refund-tutor-response-status.enum';

@ObjectType()
export class PreviewPostClassRefundClaimResult {
  @Field(() => Int)
  enrollmentId!: number;

  @Field(() => Int)
  amountInr!: number;

  @Field()
  breakdownText!: string;

  @Field(() => [PostClassRefundClaimMethodEnum])
  allowedMethods!: PostClassRefundClaimMethodEnum[];
}

@ObjectType()
export class PostClassRefundClaimSummary {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  enrollmentId!: number;

  @Field(() => PostClassRefundClaimStudentStatusEnum)
  studentStatus!: PostClassRefundClaimStudentStatusEnum;
}

@ObjectType()
export class TutorPostClassRefundClaimAlert {
  @Field(() => Int)
  claimId!: number;

  @Field()
  deadlineLabel!: string;
}

@ObjectType()
export class TutorPostClassRefundClaimDetail {
  @Field(() => Int)
  claimId!: number;

  @Field()
  studentName!: string;

  @Field()
  offeringLabel!: string;

  @Field()
  classTimeLabel!: string;

  @Field(() => PostClassRefundClaimReasonEnum)
  reason!: PostClassRefundClaimReasonEnum;

  @Field()
  reasonLabel!: string;

  @Field()
  deadlineLabel!: string;

  @Field(() => PostClassRefundTutorResponseStatusEnum)
  tutorResponseStatus!: PostClassRefundTutorResponseStatusEnum;
}
