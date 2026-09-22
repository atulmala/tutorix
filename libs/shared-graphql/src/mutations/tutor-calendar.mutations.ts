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

export const SAVE_MY_WEEKLY_UNAVAILABILITY = gql`
  mutation SaveMyWeeklyUnavailability($input: SaveMyWeeklyUnavailabilityInput!) {
    saveMyWeeklyUnavailability(input: $input) {
      unavailableSlots {
        dayOfWeek
        hour
        minute
      }
      materializedThrough
      availabilityConfiguredAt
    }
  }
`;
