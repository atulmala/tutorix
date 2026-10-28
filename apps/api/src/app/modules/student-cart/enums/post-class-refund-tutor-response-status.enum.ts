import { registerEnumType } from '@nestjs/graphql';

export enum PostClassRefundTutorResponseStatusEnum {
  pending = 'pending',
  accepted = 'accepted',
  declined = 'declined',
  deemed_accepted = 'deemed_accepted',
}

registerEnumType(PostClassRefundTutorResponseStatusEnum, {
  name: 'PostClassRefundTutorResponseStatus',
  description: 'Tutor response to a post-class refund claim',
});
