import { registerEnumType } from '@nestjs/graphql';

export enum PostClassRefundAdminStatusEnum {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
}

registerEnumType(PostClassRefundAdminStatusEnum, {
  name: 'PostClassRefundAdminStatus',
  description: 'Admin decision on a post-class refund claim',
});
