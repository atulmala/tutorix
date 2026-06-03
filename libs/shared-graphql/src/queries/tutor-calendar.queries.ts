import { gql } from '@apollo/client';

export const GET_MY_TUTOR_CALENDAR = gql`
  query GetMyTutorCalendar($from: DateTime!, $to: DateTime!) {
    myTutorCalendar(from: $from, to: $to) {
      id
      startsAt
      durationMinutes
    }
  }
`;

export const GET_MY_TUTOR_CALENDAR_UPDATED_TILL = gql`
  query GetMyTutorCalendarUpdatedTill {
    myTutorCalendarUpdatedTill
  }
`;
