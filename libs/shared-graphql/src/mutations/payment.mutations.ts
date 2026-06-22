import { gql } from '@apollo/client';
import {
  CHECKOUT_CONFIRM_RESULT_FIELDS,
  CHECKOUT_RESULT_FIELDS,
} from '../fragments/checkout.fragments';

export const INITIATE_PLATFORM_FEE_PAYMENT = gql`
  ${CHECKOUT_RESULT_FIELDS}
  mutation InitiatePlatformFeePayment($feeCode: PlatformFeeCode!) {
    initiatePlatformFeePayment(feeCode: $feeCode) {
      ...CheckoutResultFields
    }
  }
`;

export const CONFIRM_PLATFORM_FEE_PAYMENT = gql`
  ${CHECKOUT_CONFIRM_RESULT_FIELDS}
  mutation ConfirmPlatformFeePayment($input: ConfirmPlatformFeePaymentInput!) {
    confirmPlatformFeePayment(input: $input) {
      ...CheckoutConfirmResultFields
    }
  }
`;

export const INITIATE_PT_FEE_PAYMENT = gql`
  ${CHECKOUT_RESULT_FIELDS}
  mutation InitiatePtFeePayment($tutorOfferingId: ID!) {
    initiatePtFeePayment(tutorOfferingId: $tutorOfferingId) {
      ...CheckoutResultFields
    }
  }
`;

export const CONFIRM_PT_FEE_PAYMENT = gql`
  ${CHECKOUT_CONFIRM_RESULT_FIELDS}
  mutation ConfirmPtFeePayment($input: ConfirmPtFeePaymentInput!) {
    confirmPtFeePayment(input: $input) {
      ...CheckoutConfirmResultFields
    }
  }
`;

export const MY_ORDER_INVOICE = gql`
  query MyOrderInvoice($orderId: Int!) {
    myOrderInvoice(orderId: $orderId) {
      id
      invoiceNumber
      orderNumber
      amountDueInr
      amountPaidInr
      paymentMethod
      issuedAt
      pdfUrl
    }
  }
`;
