import { registerEnumType } from '@nestjs/graphql';

export enum PaymentDisbursementKindEnum {
  student_refund_wallet = 'student_refund_wallet',
  student_refund_gateway = 'student_refund_gateway',
  tutor_bank_payout = 'tutor_bank_payout',
}

registerEnumType(PaymentDisbursementKindEnum, {
  name: 'PaymentDisbursementKind',
  description: 'Outbound payment type processed from the admin payment hub',
});
