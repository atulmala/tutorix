import { gql } from '@apollo/client';

export const CASHFREE_ORDER_CAPTURE_STATUS = gql`
  query CashfreeOrderCaptureStatus($orderId: String!) {
    cashfreeOrderCaptureStatus(orderId: $orderId) {
      captured
      paymentId
    }
  }
`;

export const RAZORPAY_ORDER_CAPTURE_STATUS = gql`
  query RazorpayOrderCaptureStatus($orderId: String!) {
    razorpayOrderCaptureStatus(orderId: $orderId) {
      captured
      paymentId
    }
  }
`;
