import { registerEnumType } from '@nestjs/graphql';

export enum ClassCancellationRefundPayoutStatusEnum {
  pending = 'pending',
  processing = 'processing',
  completed = 'completed',
  failed = 'failed',
}

registerEnumType(ClassCancellationRefundPayoutStatusEnum, {
  name: 'ClassCancellationRefundPayoutStatus',
  description: 'Payout lifecycle for a class cancellation refund request',
});
