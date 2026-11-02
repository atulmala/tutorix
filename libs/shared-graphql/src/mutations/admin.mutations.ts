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

export const ADMIN_UPDATE_CLASS_PRICING_SETTINGS = gql`
  mutation AdminUpdateClassPricingSettings(
    $input: AdminUpdateClassPricingSettingsInput!
  ) {
    adminUpdateClassPricingSettings(input: $input) {
      minimumOnlinePricePerClassInr
      minimumOfflinePricePerClassInr
      commissionSlabThresholdInr
      tutorCommissionPercentUpToSlab
      tutorCommissionPercentAboveSlab
      platformFeePerParticipantInr
    }
  }
`;

export const ADMIN_UPDATE_PAYMENT_GATEWAY_FEE_SETTINGS = gql`
  mutation AdminUpdatePaymentGatewayFeeSettings(
    $input: AdminUpdatePaymentGatewayFeeSettingsInput!
  ) {
    adminUpdatePaymentGatewayFeeSettings(input: $input) {
      gstRatePercent
      gateways {
        id
        provider
        displayName
        chargePercent
      }
    }
  }
`;

export const ADMIN_UPDATE_PAYMENT_GATEWAY_FEE = gql`
  mutation AdminUpdatePaymentGatewayFee($input: AdminUpdatePaymentGatewayFeeInput!) {
    adminUpdatePaymentGatewayFee(input: $input) {
      id
      provider
      displayName
      chargePercent
    }
  }
`;

export const ADMIN_CREATE_PAYMENT_GATEWAY_FEE = gql`
  mutation AdminCreatePaymentGatewayFee($input: AdminCreatePaymentGatewayFeeInput!) {
    adminCreatePaymentGatewayFee(input: $input) {
      id
      provider
      displayName
      chargePercent
    }
  }
`;

export const ADMIN_UPDATE_REGISTRATION_SETTINGS = gql`
  mutation AdminUpdateRegistrationSettings(
    $input: AdminUpdateRegistrationSettingsInput!
  ) {
    adminUpdateRegistrationSettings(input: $input) {
      tutorRegistrationEnabled
      studentRegistrationEnabled
      disabledMessage
    }
  }
`;

export const ADMIN_PROCESS_CLASS_CANCELLATION_REFUND = gql`
  mutation AdminProcessClassCancellationRefund($requestId: Int!) {
    adminProcessClassCancellationRefund(requestId: $requestId) {
      id
      payoutStatus
      aiStatus
      walletTransactionId
      failureReason
      processedAt
    }
  }
`;

export const ADMIN_RUN_CLASS_CANCELLATION_REFUND_BATCH = gql`
  mutation AdminRunClassCancellationRefundAnalysisBatch(
    $reanalyzePendingPayouts: Boolean
  ) {
    adminRunClassCancellationRefundAnalysisBatch(
      reanalyzePendingPayouts: $reanalyzePendingPayouts
    ) {
      resetForReanalysis
      itemsFound
      analyzed
      gatewaySynced
    }
  }
`;

export const ADMIN_SEND_EMAIL = gql`
  mutation AdminSendEmail($input: AdminSendEmailInput!) {
    adminSendEmail(input: $input) {
      success
      messageId
    }
  }
`;
