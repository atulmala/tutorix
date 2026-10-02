import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TutorBookingHistoryScreen } from './TutorBookingHistoryScreen';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql/queries', () => ({
  TUTOR_CLASS_BOOKINGS: { kind: 'bookings' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (query: unknown, options?: unknown) => mockUseQuery(query, options),
}));

const first = {
  orderItemId: 15,
  bookedAt: '2026-09-20T00:00:00.000Z',
  studentName: 'Ada Lovelace',
  offeringLabel: 'Mathematics',
  classCount: 5,
  deliveryMode: 'offline',
  schedulingStatus: 'partial',
  conclusionStatus: 'not_concluded',
  scheduledCount: 2,
  concludedCount: 0,
  linePaidInr: 0,
  isDemo: true,
};

const second = {
  ...first,
  orderItemId: 16,
  studentName: 'Grace Hopper',
  offeringLabel: 'English',
  isDemo: false,
  linePaidInr: 800,
  classCount: 1,
  schedulingStatus: 'scheduled',
  conclusionStatus: 'concluded',
  scheduledCount: 1,
  concludedCount: 1,
};

describe('TutorBookingHistoryScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('shows booking details on a card and loads the next page', () => {
    mockUseQuery.mockImplementation((query: unknown, options?: { variables?: { input?: { page?: number } } }) => {
      const page = options?.variables?.input?.page ?? 1;
      return {
        loading: false,
        data: {
          tutorClassBookings: {
            items: page === 1 ? [first] : [second],
            totalCount: 2,
            page,
            pageSize: 20,
            totalPages: 2,
          },
        },
      };
    });

    const screen = render(<TutorBookingHistoryScreen />);
    expect(screen.getByText('Student · Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Mathematics · Free demo')).toBeTruthy();
    expect(screen.getByText('5 classes · Offline')).toBeTruthy();
    expect(screen.getByText('Scheduling · 2 of 5 scheduled')).toBeTruthy();
    expect(screen.getByText('Concluded · Not concluded')).toBeTruthy();
    expect(screen.getByText('₹0')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Load more'));
    expect(screen.getByText('Student · Grace Hopper')).toBeTruthy();
    expect(screen.getByText('1 class · Offline')).toBeTruthy();
    expect(screen.getByText('₹800')).toBeTruthy();
  });

  it('searches by email or mobile, offering, and status', () => {
    mockUseQuery.mockImplementation(() => ({
      loading: false,
      data: {
        tutorClassBookings: {
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
      },
    }));

    const screen = render(<TutorBookingHistoryScreen />);
    expect(screen.queryByLabelText('Student email or mobile')).toBeNull();
    fireEvent.press(screen.getByLabelText('Search bookings'));
    fireEvent.changeText(screen.getByLabelText('Student email or mobile'), 'ada@example.com');
    fireEvent.changeText(screen.getByLabelText('Offering'), 'Math');
    fireEvent.press(screen.getByLabelText('Scheduling Scheduled'));
    fireEvent.press(screen.getByLabelText('Conclusion Concluded'));
    fireEvent.press(screen.getByLabelText('Search'));

    const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
    expect(lastCall[1].variables.input).toEqual({
      page: 1,
      pageSize: 20,
      studentSearch: 'ada@example.com',
      offeringSearch: 'Math',
      schedulingStatus: 'scheduled',
      conclusionStatus: 'concluded',
    });
    expect(screen.getByText('No bookings found.')).toBeTruthy();
  });
});
