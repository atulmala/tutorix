import { gql } from '@apollo/client';

export const INITIATE_PLATFORM_FEE_PAYMENT = gql`
  mutation InitiatePlatformFeePayment($feeCode: PlatformFeeCode!) {
    initiatePlatformFeePayment(feeCode: $feeCode) {
      skipped
      provider
      orderId
      amountInr
      currency
      checkoutPayloadJson
    }
  }
`;

export const CONFIRM_PLATFORM_FEE_PAYMENT = gql`
  mutation ConfirmPlatformFeePayment($input: ConfirmPlatformFeePaymentInput!) {
    confirmPlatformFeePayment(input: $input) {
      skipped
    }
  }
`;

export const INITIATE_PT_FEE_PAYMENT = gql`
  mutation InitiatePtFeePayment($tutorOfferingId: ID!) {
    initiatePtFeePayment(tutorOfferingId: $tutorOfferingId) {
      skipped
      provider
      orderId
      amountInr
      currency
      checkoutPayloadJson
    }
  }
`;

export const CONFIRM_PT_FEE_PAYMENT = gql`
  mutation ConfirmPtFeePayment($input: ConfirmPtFeePaymentInput!) {
    confirmPtFeePayment(input: $input) {
      skipped
    }
  }
`;
