import { gql } from '@apollo/client';

export const BOOK_TUTOR_CLASS = gql`
  mutation BookTutorClass(
    $tutorCalendarId: ID!
    $offeringId: ID!
    $deliveryMode: ClassSessionDeliveryMode!
  ) {
    bookTutorClass(
      tutorCalendarId: $tutorCalendarId
      offeringId: $offeringId
      deliveryMode: $deliveryMode
    ) {
      sessionId
      enrollmentId
      seatsLeft
      status
    }
  }
`;
