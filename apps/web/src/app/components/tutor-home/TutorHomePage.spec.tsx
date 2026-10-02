import { fireEvent, render, screen } from '@testing-library/react';
import {
  formatIstBookingTimeRange,
  istHomeScheduleDays,
  PENDING_CALENDAR_TASK_ACTION,
  PENDING_CALENDAR_TASK_MESSAGE,
  PENDING_RATE_CARD_TASK_ACTION,
  PENDING_RATE_CARD_TASK_MESSAGE,
} from '@tutorix/shared-utils';
import {
  GET_MY_TUTOR_CALENDAR_UPDATED_TILL,
  GET_MY_TUTOR_DETAIL,
  TUTOR_BOOKED_CLASS_SESSIONS,
} from '@tutorix/shared-graphql';
import { TutorHomePage } from './TutorHomePage';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  GET_MY_TUTOR_DETAIL: { kind: 'detail' },
  GET_MY_TUTOR_CALENDAR_UPDATED_TILL: { kind: 'till' },
  TUTOR_BOOKED_CLASS_SESSIONS: { kind: 'sessions' },
  TUTOR_CANCEL_SCHEDULED_CLASS: { kind: 'cancel' },
  TUTOR_REQUEST_CLASS_RESCHEDULE: { kind: 'reschedule' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (query: unknown, options?: unknown) => mockUseQuery(query, options),
  useMutation: () => [jest.fn(), { loading: false }],
}));

function classesHeadingFor(
  day: { day: number; abbr: string; monthAbbr: string } | undefined,
  count: number,
): string {
  if (!day) {
    return `Classes: ${count}`;
  }
  const weekday = day.abbr.charAt(0) + day.abbr.slice(1).toLowerCase();
  const mod100 = day.day % 100;
  let suffix = 'th';
  if (mod100 < 11 || mod100 > 13) {
    if (day.day % 10 === 1) suffix = 'st';
    else if (day.day % 10 === 2) suffix = 'nd';
    else if (day.day % 10 === 3) suffix = 'rd';
  }
  return `Classes on ${weekday}, ${day.day}${suffix} ${day.monthAbbr}: ${count}`;
}

const completeOffering = {
  status: 'pt_passed',
  rateCard: { isComplete: true, offlineEnabled: true, offlineBaseRate: 400 },
};

function mockHomeQueries({
  offerings = [completeOffering],
  updatedTill = '2099-12-31T00:00:00.000Z',
}: {
  offerings?: unknown[];
  updatedTill?: string | null;
} = {}) {
  mockUseQuery.mockImplementation((query: { kind?: string }) => {
    if (query === GET_MY_TUTOR_CALENDAR_UPDATED_TILL) {
      return { loading: false, data: { myTutorCalendarUpdatedTill: updatedTill } };
    }
    if (query === GET_MY_TUTOR_DETAIL) {
      return { loading: false, data: { myTutorDetail: { offerings } } };
    }
    return { loading: false, data: null };
  });
}

describe('TutorHomePage', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockHomeQueries();
  });

  it('shows the schedule hub instead of the coming-soon placeholder', () => {
    render(<TutorHomePage />);

    expect(screen.getByText('My schedule')).toBeTruthy();
    expect(screen.getByText("Today's classes")).toBeTruthy();
    expect(screen.getByText('Teaching hours')).toBeTruthy();
    expect(screen.getByText('Concluded classes: 0')).toBeTruthy();
    const days = istHomeScheduleDays();
    expect(
      screen.getByRole('button', {
        name: `${days[0].abbr} ${days[0].day} ${days[0].monthAbbr}`,
      }),
    ).toBeTruthy();
    expect(screen.getByText(`${days[0].day} ${days[0].monthAbbr}`)).toBeTruthy();
    expect(
      screen.queryByText(
        'Manage bookings, students, and your teaching schedule — coming soon.',
      ),
    ).toBeNull();
    expect(screen.queryByText('Pending tasks')).toBeNull();
  });

  it('shows pending rate card and calendar tasks with working buttons', () => {
    mockHomeQueries({
      offerings: [
        completeOffering,
        { status: 'pt_passed', rateCard: null },
      ],
      updatedTill: null,
    });
    const onSetRateCard = jest.fn();
    const onUpdateCalendar = jest.fn();

    render(
      <TutorHomePage onSetRateCard={onSetRateCard} onUpdateCalendar={onUpdateCalendar} />,
    );

    expect(screen.getByText('Pending tasks')).toBeTruthy();
    expect(screen.getByText(PENDING_RATE_CARD_TASK_MESSAGE)).toBeTruthy();
    expect(screen.getByText(PENDING_CALENDAR_TASK_MESSAGE)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: PENDING_RATE_CARD_TASK_ACTION }));
    fireEvent.click(screen.getByRole('button', { name: PENDING_CALENDAR_TASK_ACTION }));

    expect(onSetRateCard).toHaveBeenCalledTimes(1);
    expect(onUpdateCalendar).toHaveBeenCalledTimes(1);
  });

  it('shows a scheduled demo on the selected day', () => {
    const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === TUTOR_BOOKED_CLASS_SESSIONS) {
        return {
          loading: false,
          data: {
            tutorBookedClassSessions: [
              {
                enrollmentId: '5',
                sessionId: '5',
                startsAt: startsAt.toISOString(),
                durationMinutes: 60,
                deliveryMode: 'offline',
                offeringLabel: 'Economics',
                studentName: 'Ruchi Sharma',
                isDemo: true,
              },
            ],
          },
        };
      }
      if (query === GET_MY_TUTOR_DETAIL) {
        return { loading: false, data: { myTutorDetail: { offerings: [completeOffering] } } };
      }
      return { loading: false, data: { myTutorCalendarUpdatedTill: '2099-12-31T00:00:00.000Z' } };
    });

    render(<TutorHomePage />);

    expect(screen.getByText(formatIstBookingTimeRange(startsAt, 60))).toBeTruthy();
    expect(screen.getByText('Economics')).toBeTruthy();
    expect(screen.getByText('Free demo')).toBeTruthy();
    expect(screen.getByText('Offline')).toBeTruthy();
    const today = istHomeScheduleDays().find((day) => day.isToday);
    expect(screen.getByText(classesHeadingFor(today, 1))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '1 student' }));
    expect(screen.getByText('Ruchi Sharma')).toBeTruthy();
    expect(screen.getByText('1 class')).toBeTruthy();
    expect(screen.getByText('1 hour')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel class' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Request reschedule' })).toBeTruthy();
  });

  it('hides reschedule and cancel inside the offline lead time', () => {
    const startsAt = new Date(Date.now() + 20 * 60 * 1000);
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === TUTOR_BOOKED_CLASS_SESSIONS) {
        return {
          loading: false,
          data: {
            tutorBookedClassSessions: [
              {
                enrollmentId: '5',
                sessionId: '5',
                startsAt: startsAt.toISOString(),
                durationMinutes: 60,
                deliveryMode: 'offline',
                offeringLabel: 'Economics',
                studentName: 'Ruchi Sharma',
                isDemo: false,
              },
            ],
          },
        };
      }
      if (query === GET_MY_TUTOR_DETAIL) {
        return { loading: false, data: { myTutorDetail: { offerings: [completeOffering] } } };
      }
      return { loading: false, data: { myTutorCalendarUpdatedTill: '2099-12-31T00:00:00.000Z' } };
    });

    render(<TutorHomePage />);

    expect(screen.queryByRole('button', { name: 'Cancel class' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Request reschedule' })).toBeNull();
  });

  it('lists classes whose end time has passed under concluded classes', () => {
    const startsAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === TUTOR_BOOKED_CLASS_SESSIONS) {
        return {
          loading: false,
          data: {
            tutorBookedClassSessions: [
              {
                enrollmentId: '5',
                sessionId: '5',
                startsAt: startsAt.toISOString(),
                durationMinutes: 60,
                deliveryMode: 'offline',
                offeringLabel: 'Economics',
                studentName: 'Ruchi Sharma',
                isDemo: true,
              },
            ],
          },
        };
      }
      if (query === GET_MY_TUTOR_DETAIL) {
        return { loading: false, data: { myTutorDetail: { offerings: [completeOffering] } } };
      }
      return { loading: false, data: { myTutorCalendarUpdatedTill: '2099-12-31T00:00:00.000Z' } };
    });

    render(<TutorHomePage />);

    expect(screen.getByText('No classes on this day')).toBeTruthy();
    expect(screen.getByText('Concluded classes: 1')).toBeTruthy();
    expect(screen.queryByText('Economics')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel class' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'See details' }));
  });
});
