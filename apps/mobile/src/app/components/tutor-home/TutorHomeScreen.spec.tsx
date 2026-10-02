import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  PENDING_CALENDAR_TASK_ACTION,
  PENDING_CALENDAR_TASK_MESSAGE,
} from '@tutorix/shared-utils/tutor-calendar';
import {
  PENDING_RATE_CARD_TASK_ACTION,
  PENDING_RATE_CARD_TASK_MESSAGE,
} from '@tutorix/shared-utils/rate-card';
import {
  GET_MY_TUTOR_CALENDAR_UPDATED_TILL,
  GET_MY_TUTOR_DETAIL,
  TUTOR_BOOKED_CLASS_SESSIONS,
} from '@tutorix/shared-graphql/queries';
import { formatIstBookingTimeRange } from '@tutorix/shared-utils/student-booking';
import { istHomeScheduleDays } from '@tutorix/shared-utils/student-schedule';
import { TutorHomeScreen } from './TutorHomeScreen';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql/queries', () => ({
  GET_MY_TUTOR_DETAIL: { kind: 'detail' },
  GET_MY_TUTOR_CALENDAR_UPDATED_TILL: { kind: 'till' },
  TUTOR_BOOKED_CLASS_SESSIONS: { kind: 'sessions' },
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

describe('TutorHomeScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockHomeQueries();
  });

  it('shows the schedule hub instead of the coming-soon placeholder', () => {
    const { getByText, queryByText } = render(<TutorHomeScreen />);

    expect(getByText('My schedule')).toBeTruthy();
    expect(getByText("Today's classes")).toBeTruthy();
    expect(getByText('Teaching hours')).toBeTruthy();
    expect(getByText('Concluded classes: 0')).toBeTruthy();
    const days = istHomeScheduleDays();
    expect(getByText(`${days[0].day} ${days[0].monthAbbr}`)).toBeTruthy();
    expect(getByText(`${days[13].day} ${days[13].monthAbbr}`)).toBeTruthy();
    expect(
      queryByText('Manage bookings, students, and your teaching schedule — coming soon.'),
    ).toBeNull();
    expect(queryByText('Pending tasks')).toBeNull();
  });

  it('shows pending rate card and calendar tasks with working buttons', () => {
    mockHomeQueries({
      offerings: [completeOffering, { status: 'pt_passed', rateCard: null }],
      updatedTill: null,
    });
    const onSetRateCard = jest.fn();
    const onUpdateCalendar = jest.fn();

    const { getByText, getByLabelText } = render(
      <TutorHomeScreen onSetRateCard={onSetRateCard} onUpdateCalendar={onUpdateCalendar} />,
    );

    expect(getByText('Pending tasks')).toBeTruthy();
    expect(getByText(PENDING_RATE_CARD_TASK_MESSAGE)).toBeTruthy();
    expect(getByText(PENDING_CALENDAR_TASK_MESSAGE)).toBeTruthy();

    fireEvent.press(getByLabelText(PENDING_RATE_CARD_TASK_ACTION));
    fireEvent.press(getByLabelText(PENDING_CALENDAR_TASK_ACTION));

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

    const { getByText } = render(<TutorHomeScreen />);

    expect(getByText(formatIstBookingTimeRange(startsAt, 60))).toBeTruthy();
    expect(getByText('Economics · Free demo')).toBeTruthy();
    expect(getByText('Offline')).toBeTruthy();
    const today = istHomeScheduleDays().find((day) => day.isToday);
    expect(getByText(classesHeadingFor(today, 1))).toBeTruthy();
    fireEvent.press(getByText('1 student'));
    expect(getByText('Ruchi Sharma')).toBeTruthy();
    expect(getByText('1 class')).toBeTruthy();
    expect(getByText('1 hour')).toBeTruthy();
    expect(getByText('Cancel class')).toBeTruthy();
    expect(getByText('Request reschedule')).toBeTruthy();
  });
});
