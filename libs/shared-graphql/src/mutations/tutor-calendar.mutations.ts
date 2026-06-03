import { gql } from '@apollo/client';

export const SAVE_MY_TUTOR_CALENDAR = gql`
  mutation SaveMyTutorCalendar($input: SaveMyTutorCalendarInput!) {
    saveMyTutorCalendar(input: $input) {
      id
      startsAt
      durationMinutes
    }
  }
`;
