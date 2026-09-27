import { gql } from '@apollo/client';
import { STUDENT_CART_FIELDS } from '../queries/student-cart.queries';

export const ADD_TO_CART = gql`
  ${STUDENT_CART_FIELDS}
  mutation AddToCart(
    $tutorId: ID!
    $offeringId: ID!
    $deliveryMode: ClassSessionDeliveryMode!
    $quantity: Int!
  ) {
    addToCart(
      tutorId: $tutorId
      offeringId: $offeringId
      deliveryMode: $deliveryMode
      quantity: $quantity
    ) {
      ...StudentCartFields
    }
  }
`;

export const UPDATE_CART_ITEM = gql`
  ${STUDENT_CART_FIELDS}
  mutation UpdateCartItem($itemId: ID!, $quantity: Int!) {
    updateCartItem(itemId: $itemId, quantity: $quantity) {
      ...StudentCartFields
    }
  }
`;

export const REMOVE_FROM_CART = gql`
  ${STUDENT_CART_FIELDS}
  mutation RemoveFromCart($itemId: ID!) {
    removeFromCart(itemId: $itemId) {
      ...StudentCartFields
    }
  }
`;

export const SCHEDULE_CLASS_CREDIT = gql`
  mutation ScheduleClassCredit($creditId: ID!, $tutorCalendarId: ID!) {
    scheduleClassCredit(creditId: $creditId, tutorCalendarId: $tutorCalendarId) {
      creditId
      enrollmentId
      sessionId
    }
  }
`;

export const RESCHEDULE_CLASS_CREDIT = gql`
  mutation RescheduleClassCredit($creditId: ID!, $tutorCalendarId: ID!) {
    rescheduleClassCredit(creditId: $creditId, tutorCalendarId: $tutorCalendarId) {
      creditId
      enrollmentId
      sessionId
    }
  }
`;
