import { fireEvent, render, screen } from '@testing-library/react';
import { TUTOR_CLASS_BOOKINGS } from '@tutorix/shared-graphql';
import { TutorBookingHistoryPage } from './TutorBookingHistoryPage';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  TUTOR_CLASS_BOOKINGS: { kind: 'bookings' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (query: unknown, options?: unknown) => mockUseQuery(query, options),
}));

const row = {
  orderItemId: 15,
  bookedAt: '2026-09-20T00:00:00.000Z',
  studentName: 'Ada Lovelace',
  offeringLabel: 'Mathematics',
  classCount: 5,
  deliveryMode: 'online',
  schedulingStatus: 'partial',
  conclusionStatus: 'partial',
  scheduledCount: 2,
  unscheduledCount: 3,
  cancelledCount: 0,
  concludedCount: 2,
  linePaidInr: 2500,
  isDemo: false,
};

function mockResult(overrides?: {
  items?: typeof row[];
  page?: number;
  totalPages?: number;
  totalCount?: number;
  error?: Error;
  loading?: boolean;
}) {
  mockUseQuery.mockImplementation((query: unknown, options?: { variables?: unknown }) => {
    if (query !== TUTOR_CLASS_BOOKINGS) {
      return { loading: false, data: undefined };
    }
    return {
      loading: overrides?.loading ?? false,
      error: overrides?.error,
      data: overrides?.error
        ? undefined
        : {
            tutorClassBookings: {
              items: overrides?.items ?? [row],
              totalCount: overrides?.totalCount ?? 21,
              page: overrides?.page ?? 1,
              pageSize: 20,
              totalPages: overrides?.totalPages ?? 2,
            },
          },
      variables: options?.variables,
    };
  });
}

describe('TutorBookingHistoryPage', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('renders booking columns and a purchase row', () => {
    mockResult({ totalPages: 1, totalCount: 1 });
    render(<TutorBookingHistoryPage />);

    expect(screen.getByRole('columnheader', { name: 'Booking date' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Student name' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Classes booked' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Scheduling status' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Concluded status' })).toBeTruthy();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Mathematics')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.getByText('2 of 5 scheduled')).toBeTruthy();
    expect(screen.getByText('2 of 5 concluded')).toBeTruthy();
    expect(screen.getByText('₹2500')).toBeTruthy();
  });

  it('searches by email or mobile, offering, and statuses', () => {
    mockResult({ totalPages: 1, totalCount: 1 });
    render(<TutorBookingHistoryPage />);

    fireEvent.change(screen.getByLabelText('Student email or mobile'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Offering'), {
      target: { value: 'Math' },
    });
    fireEvent.change(screen.getByLabelText('Scheduling status'), {
      target: { value: 'scheduled' },
    });
    fireEvent.change(screen.getByLabelText('Conclusion status'), {
      target: { value: 'concluded' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    const lastCall = mockUseQuery.mock.calls.at(-1);
    expect(lastCall?.[1]).toEqual({
      variables: {
        input: {
          page: 1,
          pageSize: 20,
          studentSearch: 'ada@example.com',
          offeringSearch: 'Math',
          schedulingStatus: 'scheduled',
          conclusionStatus: 'concluded',
        },
      },
      fetchPolicy: 'cache-and-network',
    });
  });

  it('pages to the next set of bookings', () => {
    mockResult();
    render(<TutorBookingHistoryPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const lastCall = mockUseQuery.mock.calls.at(-1);
    expect(lastCall?.[1].variables.input.page).toBe(2);
  });

  it('shows an empty state and a load error', () => {
    mockResult({ items: [], totalCount: 0, totalPages: 1 });
    const { rerender } = render(<TutorBookingHistoryPage />);
    expect(screen.getByText('No bookings found.')).toBeTruthy();

    mockResult({ error: new Error('nope'), items: [] });
    rerender(<TutorBookingHistoryPage />);
    expect(screen.getByText('Could not load booking history.')).toBeTruthy();
  });
});
