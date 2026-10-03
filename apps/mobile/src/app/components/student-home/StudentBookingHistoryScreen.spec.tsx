import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StudentBookingHistoryScreen } from './StudentBookingHistoryScreen';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql/queries', () => ({
  STUDENT_CLASS_BOOKINGS: { kind: 'student-bookings' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (query: unknown, options?: unknown) => mockUseQuery(query, options),
}));

const first = {
  orderItemId: 15,
  bookedAt: '2026-09-20T00:00:00.000Z',
  tutorId: 4,
  tutorName: 'Grace Hopper',
  offeringLabel: 'CBSE | Economics | Classes 11',
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
  tutorName: 'Alan Turing',
  offeringLabel: 'Mathematics',
  isDemo: false,
  linePaidInr: 800,
  classCount: 1,
  schedulingStatus: 'scheduled',
  conclusionStatus: 'concluded',
  scheduledCount: 1,
  concludedCount: 1,
};

const options = {
  tutors: [
    { id: 8, name: 'Alan Turing' },
    { id: 4, name: 'Grace Hopper' },
  ],
  subjects: ['CBSE | Economics | Classes 11', 'Mathematics'],
};

describe('StudentBookingHistoryScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('hides tutor and subject lists until Search bookings is tapped', () => {
    mockUseQuery.mockImplementation(
      (_query: unknown, queryOptions?: { variables?: { input?: { page?: number } } }) => {
        const page = queryOptions?.variables?.input?.page ?? 1;
        return {
          loading: false,
          data: {
            studentClassBookings: {
              items: page === 1 ? [first] : [second],
              ...options,
              totalCount: 2,
              page,
              pageSize: 20,
              totalPages: 2,
            },
          },
        };
      },
    );

    const screen = render(<StudentBookingHistoryScreen />);
    expect(screen.queryByLabelText('Tutor')).toBeNull();
    fireEvent.press(screen.getByLabelText('Search bookings'));
    expect(screen.getByLabelText('Tutor')).toBeTruthy();
    expect(screen.getByLabelText('Subject')).toBeTruthy();
    expect(screen.queryByLabelText('Tutor Grace Hopper')).toBeNull();
    fireEvent.press(screen.getByLabelText('Tutor'));
    fireEvent.press(screen.getByLabelText('Tutor Grace Hopper'));
    fireEvent.press(screen.getByLabelText('Subject'));
    fireEvent.press(screen.getByLabelText('Subject CBSE | Economics | Classes 11'));
    const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
    expect(lastCall[1].variables.input).toEqual({
      page: 1,
      pageSize: 20,
      tutorId: 4,
      offeringLabel: 'CBSE | Economics | Classes 11',
    });
  });

  it('shows the tutor, amount beside the date, and loads the next page', () => {
    mockUseQuery.mockImplementation(
      (_query: unknown, queryOptions?: { variables?: { input?: { page?: number } } }) => {
        const page = queryOptions?.variables?.input?.page ?? 1;
        return {
          loading: false,
          data: {
            studentClassBookings: {
              items: page === 1 ? [first] : [second],
              ...options,
              totalCount: 2,
              page,
              pageSize: 20,
              totalPages: 2,
            },
          },
        };
      },
    );

    const screen = render(<StudentBookingHistoryScreen />);
    expect(screen.getByText('Tutor · Grace Hopper')).toBeTruthy();
    expect(screen.getByText('CBSE | Economics | Classes 11 · Free demo')).toBeTruthy();
    expect(screen.getByText('₹0')).toBeTruthy();
    expect(screen.getByText('Scheduling · 2 of 5 scheduled')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Load more'));
    expect(screen.getByText('Tutor · Alan Turing')).toBeTruthy();
    expect(screen.getByText('₹800')).toBeTruthy();
  });
});
