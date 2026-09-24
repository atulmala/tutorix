import { fireEvent, render, screen } from '@testing-library/react';
import { STUDENT_BOOKED_CLASS_SESSIONS } from '@tutorix/shared-graphql';
import { istHomeScheduleDays } from '@tutorix/shared-utils';
import { StudentHomePage } from './StudentHomePage';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  STUDENT_BOOKED_CLASS_SESSIONS: { kind: 'booked' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

describe('StudentHomePage', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseQuery.mockReturnValue({ loading: false, data: { studentBookedClassSessions: [] } });
  });

  it('shows the schedule hub and opens tutor search', () => {
    const onOpenTutorSearch = jest.fn();
    render(<StudentHomePage onOpenTutorSearch={onOpenTutorSearch} />);

    expect(screen.getByText('My schedule')).toBeTruthy();
    expect(screen.getByText("Today's classes")).toBeTruthy();
    expect(screen.getByText('Learning hours')).toBeTruthy();
    expect(screen.getByText('Concluded classes')).toBeTruthy();
    const days = istHomeScheduleDays();
    expect(
      screen.getByRole('button', {
        name: `${days[0].abbr} ${days[0].day} ${days[0].monthAbbr}`,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: `${days[13].abbr} ${days[13].day} ${days[13].monthAbbr}`,
      }),
    ).toBeTruthy();
    expect(screen.getByText(`${days[0].day} ${days[0].monthAbbr}`)).toBeTruthy();
    expect(screen.queryByText('What do you want to learn?')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Find a tutor' }));
    expect(onOpenTutorSearch).toHaveBeenCalledTimes(1);
  });

  it('lists booked 1-hour classes for the selected day', () => {
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === STUDENT_BOOKED_CLASS_SESSIONS) {
        return {
          loading: false,
          data: {
            studentBookedClassSessions: [
              {
                enrollmentId: '70',
                startsAt: new Date().toISOString(),
                durationMinutes: 60,
                deliveryMode: 'online',
                offeringLabel: 'Mathematics',
                tutorName: 'Anita Sharma',
              },
            ],
          },
        };
      }
      return { loading: false, data: null };
    });

    render(<StudentHomePage onOpenTutorSearch={jest.fn()} />);

    expect(screen.getByText('Mathematics')).toBeTruthy();
    expect(screen.getByText(/Online · Anita Sharma/)).toBeTruthy();
    expect(screen.getByText("1 class")).toBeTruthy();
  });
});
