import { registerEnumType } from '@nestjs/graphql';

export enum PaymentDisbursementSourceTypeEnum {
  class_cancellation_refund_request = 'class_cancellation_refund_request',
  tutor_payout_period = 'tutor_payout_period',
}

registerEnumType(PaymentDisbursementSourceTypeEnum, {
  name: 'PaymentDisbursementSourceType',
  description: 'Business object that originated a payment disbursement',
});
