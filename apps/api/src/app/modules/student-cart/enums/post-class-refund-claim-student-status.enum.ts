import { registerEnumType } from '@nestjs/graphql';

export enum PostClassRefundClaimStudentStatusEnum {
  under_process = 'under_process',
  approved = 'approved',
  rejected = 'rejected',
  settled = 'settled',
}

registerEnumType(PostClassRefundClaimStudentStatusEnum, {
  name: 'PostClassRefundClaimStudentStatus',
  description: 'Student-facing status on concluded class cards',
});
