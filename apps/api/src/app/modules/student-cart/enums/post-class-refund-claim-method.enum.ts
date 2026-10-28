import { registerEnumType } from '@nestjs/graphql';

export enum PostClassRefundClaimMethodEnum {
  gateway = 'gateway',
  wallet = 'wallet',
  class_credit = 'class_credit',
}

registerEnumType(PostClassRefundClaimMethodEnum, {
  name: 'PostClassRefundClaimMethod',
  description: 'How a post-class refund should be fulfilled',
});

export function postClassRefundClaimMethodLabel(
  method: PostClassRefundClaimMethodEnum,
): string {
  switch (method) {
    case PostClassRefundClaimMethodEnum.gateway:
      return 'Cash refund through payment gateway';
    case PostClassRefundClaimMethodEnum.wallet:
      return 'Wallet refund';
    case PostClassRefundClaimMethodEnum.class_credit:
      return 'Class credit with the same tutor';
    default:
      return method;
  }
}
