import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  TUTOR_BOOKABLE_SLOTS,
  TUTOR_SEARCH_DETAIL,
} from '@tutorix/shared-graphql/queries';
import { StudentTutorBookingScreen } from './StudentTutorBookingScreen';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql/queries', () => ({
  TUTOR_SEARCH_DETAIL: { kind: 'detail' },
  TUTOR_BOOKABLE_SLOTS: { kind: 'slots' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

describe('StudentTutorBookingScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('lists 1-hour chips and continues with the selected slot', () => {
    const startsAt = new Date().toISOString();
    const onContinue = jest.fn();
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === TUTOR_SEARCH_DETAIL) {
        return {
          loading: false,
          data: {
            tutorSearchDetail: {
              displayName: 'Anita Sharma',
              matchingOffering: {
                offeringLabel: 'CBSE · Class 8 · Mathematics',
                offlineEnabled: true,
                onlineEnabled: false,
              },
            },
          },
        };
      }
      if (query === TUTOR_BOOKABLE_SLOTS) {
        return {
          loading: false,
          data: {
            tutorBookableSlots: [
              { tutorCalendarId: '11', startsAt, seatsLeft: 1, batchSize: 1 },
            ],
          },
        };
      }
      return { loading: false, data: null };
    });

    const { getByText } = render(
      <StudentTutorBookingScreen tutorId="3" offeringId="30" onContinue={onContinue} />,
    );

    expect(getByText('Book a class')).toBeTruthy();
    fireEvent.press(getByText(/AM|PM/));
    fireEvent.press(getByText('Continue'));
    expect(onContinue).toHaveBeenCalledWith({
      tutorId: '3',
      offeringId: '30',
      tutorCalendarId: '11',
      deliveryMode: 'offline',
      startsAt,
    });
  });

  it('keeps the confirm selection when returning to the calendar', () => {
    const startsAt = new Date().toISOString();
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === TUTOR_SEARCH_DETAIL) {
        return {
          loading: false,
          data: {
            tutorSearchDetail: {
              displayName: 'Anita Sharma',
              matchingOffering: {
                offeringLabel: 'CBSE · Class 8 · Mathematics',
                offlineEnabled: true,
                onlineEnabled: false,
              },
            },
          },
        };
      }
      if (query === TUTOR_BOOKABLE_SLOTS) {
        return {
          loading: false,
          data: {
            tutorBookableSlots: [
              { tutorCalendarId: '11', startsAt, seatsLeft: 1, batchSize: 1 },
            ],
          },
        };
      }
      return { loading: false, data: null };
    });

    const onContinue = jest.fn();
    const { getByText } = render(
      <StudentTutorBookingScreen
        tutorId="3"
        offeringId="30"
        draft={{
          tutorId: '3',
          offeringId: '30',
          tutorCalendarId: '11',
          deliveryMode: 'offline',
          startsAt,
        }}
        onContinue={onContinue}
      />,
    );

    fireEvent.press(getByText('Continue'));
    expect(onContinue).toHaveBeenCalledWith({
      tutorId: '3',
      offeringId: '30',
      tutorCalendarId: '11',
      deliveryMode: 'offline',
      startsAt,
    });
  });
});
