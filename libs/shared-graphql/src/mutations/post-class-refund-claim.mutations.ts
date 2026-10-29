import { gql } from '@apollo/client';

export const SUBMIT_POST_CLASS_REFUND_CLAIM = gql`
  mutation SubmitPostClassRefundClaim(
    $enrollmentId: ID!
    $reason: PostClassRefundClaimReason!
    $refundMethod: PostClassRefundClaimMethod!
  ) {
    submitPostClassRefundClaim(
      enrollmentId: $enrollmentId
      reason: $reason
      refundMethod: $refundMethod
    ) {
      id
      enrollmentId
      studentStatus
    }
  }
`;

export const TUTOR_RESPOND_POST_CLASS_REFUND_CLAIM = gql`
  mutation TutorRespondPostClassRefundClaim(
    $claimId: Int!
    $accept: Boolean!
    $declineComment: String
  ) {
    tutorRespondPostClassRefundClaim(
      claimId: $claimId
      accept: $accept
      declineComment: $declineComment
    ) {
      id
      enrollmentId
      studentStatus
    }
  }
`;

export const ADMIN_APPROVE_POST_CLASS_REFUND_CLAIM = gql`
  mutation AdminApprovePostClassRefundClaim($claimId: Int!) {
    adminApprovePostClassRefundClaim(claimId: $claimId) {
      id
      studentStatus
      adminStatus
    }
  }
`;

export const ADMIN_REJECT_POST_CLASS_REFUND_CLAIM = gql`
  mutation AdminRejectPostClassRefundClaim($claimId: Int!, $comment: String) {
    adminRejectPostClassRefundClaim(claimId: $claimId, comment: $comment) {
      id
      studentStatus
      adminStatus
    }
  }
`;
