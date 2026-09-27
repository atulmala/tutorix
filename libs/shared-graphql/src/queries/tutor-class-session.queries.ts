import { gql } from '@apollo/client';

export const TUTOR_BOOKABLE_SLOTS = gql`
  query TutorBookableSlots(
    $tutorId: ID!
    $offeringId: ID!
    $deliveryMode: ClassSessionDeliveryMode!
    $from: DateTime!
    $to: DateTime!
  ) {
    tutorBookableSlots(
      tutorId: $tutorId
      offeringId: $offeringId
      deliveryMode: $deliveryMode
      from: $from
      to: $to
    ) {
      tutorCalendarId
      startsAt
      seatsLeft
      batchSize
    }
  }
`;

export const STUDENT_BOOKED_CLASS_SESSIONS = gql`
  query StudentBookedClassSessions($from: DateTime!, $to: DateTime!) {
    studentBookedClassSessions(from: $from, to: $to) {
      enrollmentId
      sessionId
      tutorCalendarId
      startsAt
      durationMinutes
      deliveryMode
      offeringLabel
      tutorName
    }
  }
`;
