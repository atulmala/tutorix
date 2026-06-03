import { registerEnumType } from '@nestjs/graphql';

export enum TutorOfferingPtFeeStatusEnum {
  waived = 'waived',
  pending = 'pending',
  paid = 'paid',
}

registerEnumType(TutorOfferingPtFeeStatusEnum, {
  name: 'TutorOfferingPtFeeStatusEnum',
  description: 'Payment status for proficiency test attempt fee on a tutor offering',
});
