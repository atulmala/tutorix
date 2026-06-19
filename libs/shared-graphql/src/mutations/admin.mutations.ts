import { gql } from '@apollo/client';

export const ADMIN_REVIEW_DOCUMENT = gql`
  mutation AdminReviewDocument($input: AdminReviewEducationDocumentInput!) {
    adminReviewDocument(input: $input) {
      id
      name
      documentType
      filename
      mimeType
      previewUrl
      viewUrl
      screening {
        status
        summaryNotes
        confidence
        automatedAt
        reviewerNote
        reviewedAt
      }
    }
  }
`;

export const ADMIN_SET_TEST_TUTOR = gql`
  mutation AdminSetTestTutor($tutorId: Int!, $testTutor: Boolean!) {
    adminSetTestTutor(tutorId: $tutorId, testTutor: $testTutor) {
      id
      testTutor
    }
  }
`;

export const ADMIN_UPDATE_PLATFORM_FEE = gql`
  mutation AdminUpdatePlatformFee($input: AdminUpdatePlatformFeeInput!) {
    adminUpdatePlatformFee(input: $input) {
      id
      code
      displayName
      amountInr
      discountType
      discountValue
      discountAmountInr
      effectiveAmountInr
      waived
      promoMessage
    }
  }
`;
