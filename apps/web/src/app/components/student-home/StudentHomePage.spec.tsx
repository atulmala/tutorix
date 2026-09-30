import { fireEvent, render, screen } from '@testing-library/react';
import { STUDENT_BOOKED_CLASS_SESSIONS } from '@tutorix/shared-graphql';
import { istDayKey, istHomeScheduleDays } from '@tutorix/shared-utils';
import { StudentHomePage } from './StudentHomePage';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  STUDENT_BOOKED_CLASS_SESSIONS: { kind: 'booked' },
  MY_CLASS_CREDITS: { kind: 'credits' },
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
    expect(screen.getByText('Concluded classes: 0')).toBeTruthy();
    expect(screen.getByText('Today: 0 hours')).toBeTruthy();
    expect(screen.getByText('Till now: 0')).toBeTruthy();
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
    expect(screen.getByRole('button', { name: 'Find a tutor' })).toBeTruthy();
  });

  it('shows unscheduled classes on home after login', () => {
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query.kind === 'credits') {
        return {
          loading: false,
          data: {
            myClassCredits: [{ id: 12, status: 'unscheduled' }],
          },
        };
      }
      return { loading: false, data: { studentBookedClassSessions: [] } };
    });

    const onScheduleCredits = jest.fn();
    render(
      <StudentHomePage
        onOpenTutorSearch={jest.fn()}
        onScheduleCredits={onScheduleCredits}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /1 class to schedule/ }));
    expect(onScheduleCredits).toHaveBeenCalledTimes(1);
  });

  it('counts concluded classes and opens the details page', () => {
    const endedToday = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const endedEarlier = new Date(Date.now() - 26 * 60 * 60 * 1000);
    const todayKey = istHomeScheduleDays().find((day) => day.isToday)?.key;
    const todayCount = [endedToday, endedEarlier].filter(
      (startsAt) => istDayKey(startsAt) === todayKey,
    ).length;
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === STUDENT_BOOKED_CLASS_SESSIONS) {
        return {
          loading: false,
          data: {
            studentBookedClassSessions: [
              {
                enrollmentId: '38',
                startsAt: endedToday.toISOString(),
                durationMinutes: 60,
                deliveryMode: 'offline',
                offeringLabel: 'Economics',
                tutorName: 'Navya',
              },
              {
                enrollmentId: '12',
                startsAt: endedEarlier.toISOString(),
                durationMinutes: 60,
                deliveryMode: 'online',
                offeringLabel: 'Physics',
                tutorName: 'Amit',
              },
            ],
          },
        };
      }
      return { loading: false, data: null };
    });

    const onOpenConcludedClasses = jest.fn();
    render(
      <StudentHomePage
        onOpenTutorSearch={jest.fn()}
        onOpenConcludedClasses={onOpenConcludedClasses}
      />,
    );

    expect(screen.getByText('No classes on this day')).toBeTruthy();
    expect(screen.getByText('Concluded classes: 2')).toBeTruthy();
    expect(
      screen.getByText(`Today: ${todayCount} ${todayCount === 1 ? 'hour' : 'hours'}`),
    ).toBeTruthy();
    expect(screen.getByText('Till now: 2')).toBeTruthy();
    expect(screen.queryByText('Economics')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'See details' }));
    expect(onOpenConcludedClasses).toHaveBeenCalledTimes(1);
  });
});
