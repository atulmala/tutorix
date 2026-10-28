import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ClassSessionDeliveryModeEnum } from '../../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { PostClassRefundAdminStatusEnum } from '../../enums/post-class-refund-admin-status.enum';
import { PostClassRefundClaimMethodEnum } from '../../enums/post-class-refund-claim-method.enum';
import { PostClassRefundClaimReasonEnum } from '../../enums/post-class-refund-claim-reason.enum';
import { PostClassRefundClaimStudentStatusEnum } from '../../enums/post-class-refund-claim-student-status.enum';
import { PostClassRefundTutorResponseStatusEnum } from '../../enums/post-class-refund-tutor-response-status.enum';

@ObjectType()
export class AdminPostClassRefundClaimListItem {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  studentId!: number;

  @Field()
  studentName!: string;

  @Field(() => Int)
  tutorId!: number;

  @Field()
  tutorName!: string;

  @Field()
  offeringLabel!: string;

  @Field()
  classStartsAt!: Date;

  @Field(() => Int)
  durationMinutes!: number;

  @Field(() => ClassSessionDeliveryModeEnum)
  deliveryMode!: ClassSessionDeliveryModeEnum;

  @Field(() => PostClassRefundClaimReasonEnum)
  reason!: PostClassRefundClaimReasonEnum;

  @Field()
  reasonLabel!: string;

  @Field(() => PostClassRefundClaimMethodEnum)
  refundMethod!: PostClassRefundClaimMethodEnum;

  @Field(() => Int)
  previewAmountInr!: number;

  @Field(() => PostClassRefundTutorResponseStatusEnum)
  tutorResponseStatus!: PostClassRefundTutorResponseStatusEnum;

  @Field(() => String, { nullable: true })
  tutorDeclineComment?: string | null;

  @Field(() => PostClassRefundAdminStatusEnum)
  adminStatus!: PostClassRefundAdminStatusEnum;

  @Field(() => String, { nullable: true })
  adminComment?: string | null;

  @Field(() => PostClassRefundClaimStudentStatusEnum)
  studentStatus!: PostClassRefundClaimStudentStatusEnum;

  @Field()
  submittedAt!: Date;
}
