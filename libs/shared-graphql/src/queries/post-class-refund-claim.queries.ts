import { gql } from '@apollo/client';

export const PREVIEW_POST_CLASS_REFUND_CLAIM = gql`
  query PreviewPostClassRefundClaim(
    $enrollmentId: ID!
    $reason: PostClassRefundClaimReason!
  ) {
    previewPostClassRefundClaim(enrollmentId: $enrollmentId, reason: $reason) {
      enrollmentId
      amountInr
      breakdownText
      allowedMethods
    }
  }
`;

export const TUTOR_PENDING_POST_CLASS_REFUND_CLAIM_ALERT = gql`
  query TutorPendingPostClassRefundClaimAlert {
    tutorPendingPostClassRefundClaimAlert {
      claimId
      deadlineLabel
    }
  }
`;

export const TUTOR_POST_CLASS_REFUND_CLAIM_DETAIL = gql`
  query TutorPostClassRefundClaimDetail($claimId: Int!) {
    tutorPostClassRefundClaimDetail(claimId: $claimId) {
      claimId
      studentName
      offeringLabel
      classTimeLabel
      reason
      reasonLabel
      deadlineLabel
      tutorResponseStatus
    }
  }
`;

export const GET_ADMIN_POST_CLASS_REFUND_CLAIMS = gql`
  query AdminPostClassRefundClaims($input: AdminPostClassRefundClaimListInput!) {
    adminPostClassRefundClaims(input: $input) {
      items {
        id
        studentId
        studentName
        tutorId
        tutorName
        offeringLabel
        classStartsAt
        durationMinutes
        deliveryMode
        reason
        reasonLabel
        refundMethod
        previewAmountInr
        tutorResponseStatus
        tutorDeclineComment
        adminStatus
        adminComment
        studentStatus
        submittedAt
      }
      total
      page
      pageSize
    }
  }
`;
