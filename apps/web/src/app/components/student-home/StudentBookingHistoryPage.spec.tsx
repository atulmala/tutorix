import { fireEvent, render, screen } from '@testing-library/react';
import { STUDENT_CLASS_BOOKINGS } from '@tutorix/shared-graphql';
import { StudentBookingHistoryPage } from './StudentBookingHistoryPage';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  STUDENT_CLASS_BOOKINGS: { kind: 'student-bookings' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (query: unknown, options?: unknown) => mockUseQuery(query, options),
}));

const row = {
  orderItemId: 15,
  bookedAt: '2026-09-20T00:00:00.000Z',
  tutorId: 4,
  tutorName: 'Grace Hopper',
  offeringLabel: 'CBSE | Economics | Classes 11',
  classCount: 5,
  deliveryMode: 'online',
  schedulingStatus: 'partial',
  conclusionStatus: 'partial',
  scheduledCount: 2,
  unscheduledCount: 3,
  cancelledCount: 0,
  concludedCount: 2,
  linePaidInr: 0,
  isDemo: true,
};

function mockResult(overrides?: {
  items?: typeof row[];
  tutors?: { id: number; name: string }[];
  subjects?: string[];
  page?: number;
  totalPages?: number;
  totalCount?: number;
  error?: Error;
  loading?: boolean;
}) {
  mockUseQuery.mockImplementation((query: unknown, options?: { variables?: unknown }) => {
    if (query !== STUDENT_CLASS_BOOKINGS) {
      return { loading: false, data: undefined };
    }
    return {
      loading: overrides?.loading ?? false,
      error: overrides?.error,
      data: overrides?.error
        ? undefined
        : {
            studentClassBookings: {
              items: overrides?.items ?? [row],
              tutors: overrides?.tutors ?? [
                { id: 8, name: 'Alan Turing' },
                { id: 4, name: 'Grace Hopper' },
              ],
              subjects: overrides?.subjects ?? [
                'CBSE | Economics | Classes 11',
                'Mathematics',
              ],
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

describe('StudentBookingHistoryPage', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('renders booking columns with the tutor and a free demo', () => {
    mockResult({ totalPages: 1, totalCount: 1 });
    render(<StudentBookingHistoryPage />);

    expect(screen.getByRole('columnheader', { name: 'Tutor' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Booking date' })).toBeTruthy();
    expect(screen.getAllByText('Grace Hopper').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CBSE | Economics | Classes 11').length).toBeGreaterThan(0);
    expect(screen.getByText('Free demo')).toBeTruthy();
    expect(screen.getByText('2 of 5 scheduled')).toBeTruthy();
    expect(screen.getByText('2 of 5 concluded')).toBeTruthy();
    expect(screen.getByText('₹0')).toBeTruthy();
  });

  it('filters by tutor and subject and resets to page 1', () => {
    mockResult({ totalPages: 1, totalCount: 1 });
    render(<StudentBookingHistoryPage />);

    fireEvent.change(screen.getByLabelText('Tutor'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'CBSE | Economics | Classes 11' },
    });

    const lastCall = mockUseQuery.mock.calls.at(-1);
    expect(lastCall?.[1]).toEqual({
      variables: {
        input: {
          page: 1,
          pageSize: 20,
          tutorId: 4,
          offeringLabel: 'CBSE | Economics | Classes 11',
        },
      },
      fetchPolicy: 'cache-and-network',
    });
    expect(screen.getByRole('option', { name: 'Alan Turing' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Mathematics' })).toBeTruthy();
  });

  it('pages to the next set of bookings', () => {
    mockResult();
    render(<StudentBookingHistoryPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const lastCall = mockUseQuery.mock.calls.at(-1);
    expect(lastCall?.[1].variables.input.page).toBe(2);
  });

  it('shows an empty state and an error', () => {
    mockResult({ items: [], totalCount: 0, totalPages: 1 });
    const { rerender } = render(<StudentBookingHistoryPage />);
    expect(screen.getByText('No bookings found.')).toBeTruthy();

    mockResult({ error: new Error('down'), totalPages: 1 });
    rerender(<StudentBookingHistoryPage />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
