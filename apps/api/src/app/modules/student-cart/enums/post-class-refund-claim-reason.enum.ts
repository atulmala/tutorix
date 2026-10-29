import { registerEnumType } from '@nestjs/graphql';

export enum PostClassRefundClaimReasonEnum {
  class_did_not_take_place = 'class_did_not_take_place',
  technical_issue = 'technical_issue',
  not_satisfied = 'not_satisfied',
}

registerEnumType(PostClassRefundClaimReasonEnum, {
  name: 'PostClassRefundClaimReason',
  description: 'Why a student is claiming a refund after class ended',
});

export function postClassRefundClaimReasonLabel(
  reason: PostClassRefundClaimReasonEnum,
): string {
  switch (reason) {
    case PostClassRefundClaimReasonEnum.class_did_not_take_place:
      return 'Class did not take place';
    case PostClassRefundClaimReasonEnum.technical_issue:
      return 'Technical issue (video, sound, or whiteboard)';
    case PostClassRefundClaimReasonEnum.not_satisfied:
      return 'Not satisfied with class quality / duration too short';
    default:
      return reason;
  }
}
