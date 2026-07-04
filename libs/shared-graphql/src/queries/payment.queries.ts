import { gql } from '@apollo/client';

export const RAZORPAY_ORDER_CAPTURE_STATUS = gql`
  query RazorpayOrderCaptureStatus($orderId: String!) {
    razorpayOrderCaptureStatus(orderId: $orderId) {
      captured
      paymentId
    }
  }
`;
