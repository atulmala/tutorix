import { registerEnumType } from '@nestjs/graphql';

export enum ClassCancellationRefundInitiatedByEnum {
  student = 'student',
  tutor = 'tutor',
}

registerEnumType(ClassCancellationRefundInitiatedByEnum, {
  name: 'ClassCancellationRefundInitiatedBy',
  description: 'Who initiated the class cancellation refund request',
});
