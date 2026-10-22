import { registerEnumType } from '@nestjs/graphql';

export enum ClassCancellationRefundAiStatusEnum {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
}

registerEnumType(ClassCancellationRefundAiStatusEnum, {
  name: 'ClassCancellationRefundAiStatus',
  description: 'Advisory AI review status for a class cancellation refund',
});
