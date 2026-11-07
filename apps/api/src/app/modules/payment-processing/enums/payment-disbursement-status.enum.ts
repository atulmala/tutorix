import { registerEnumType } from '@nestjs/graphql';

export enum PaymentDisbursementStatusEnum {
  ready = 'ready',
  processing = 'processing',
  completed = 'completed',
  failed = 'failed',
  cancelled = 'cancelled',
}

registerEnumType(PaymentDisbursementStatusEnum, {
  name: 'PaymentDisbursementStatus',
  description: 'Lifecycle status of an admin payment disbursement',
});
