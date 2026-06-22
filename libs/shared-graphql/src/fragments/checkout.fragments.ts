import { gql } from '@apollo/client';

export const CHECKOUT_ORDER_FIELDS = gql`
  fragment CheckoutOrderFields on CommerceOrderDto {
    id
    orderNumber
    status
    amountDueInr
    amountPaidInr
    paymentMethod
    paidAt
  }
`;

export const CHECKOUT_SESSION_FIELDS = gql`
  fragment CheckoutSessionFields on PaymentOrderSessionDto {
    skipped
    provider
    orderId
    amountInr
    currency
    checkoutPayloadJson
  }
`;

export const CHECKOUT_RESULT_FIELDS = gql`
  fragment CheckoutResultFields on CheckoutResultDto {
    order {
      ...CheckoutOrderFields
    }
    session {
      ...CheckoutSessionFields
    }
  }
  ${CHECKOUT_ORDER_FIELDS}
  ${CHECKOUT_SESSION_FIELDS}
`;

export const CHECKOUT_CONFIRM_RESULT_FIELDS = gql`
  fragment CheckoutConfirmResultFields on CheckoutResultDto {
    order {
      id
      orderNumber
      status
      amountDueInr
      paymentMethod
      paidAt
    }
    session {
      skipped
    }
  }
`;
