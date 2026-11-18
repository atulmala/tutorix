import { registerEnumType } from '@nestjs/graphql';

export enum TutorPayoutCreditBucketEnum {
  payable = 'payable',
  in_dispute_window = 'in_dispute_window',
  under_dispute = 'under_dispute',
  carried_forward = 'carried_forward',
}

registerEnumType(TutorPayoutCreditBucketEnum, {
  name: 'TutorPayoutCreditBucket',
  description: 'How a concluded class counts toward tutor monthly earnings',
});