import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { STUDENT_BOOKED_CLASS_SESSIONS } from '@tutorix/shared-graphql/queries';
import { istHomeScheduleDays } from '@tutorix/shared-utils/student-schedule';
import { StudentHomeScreen } from './StudentHomeScreen';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql/queries', () => ({
  STUDENT_BOOKED_CLASS_SESSIONS: { kind: 'booked' },
  MY_CLASS_CREDITS: { kind: 'credits' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

describe('StudentHomeScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseQuery.mockReturnValue({ loading: false, data: { studentBookedClassSessions: [] } });
  });

  it('shows the schedule hub without opening the subject picker', () => {
    const onOpenTutorSearch = jest.fn();
    const { getByText, queryByText } = render(
      <StudentHomeScreen onOpenTutorSearch={onOpenTutorSearch} />,
    );

    expect(getByText('My schedule')).toBeTruthy();
    expect(getByText("Today's classes")).toBeTruthy();
    expect(getByText('Learning hours')).toBeTruthy();
    expect(getByText('Concluded classes')).toBeTruthy();
    const days = istHomeScheduleDays();
    expect(getByText(`${days[0].day} ${days[0].monthAbbr}`)).toBeTruthy();
    expect(getByText(`${days[13].day} ${days[13].monthAbbr}`)).toBeTruthy();
    expect(queryByText('What do you want to learn?')).toBeNull();

    fireEvent.press(getByText('Find a tutor'));
    expect(onOpenTutorSearch).toHaveBeenCalled();
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
                deliveryMode: 'offline',
                offeringLabel: 'Mathematics',
                tutorName: 'Anita Sharma',
              },
            ],
          },
        };
      }
      return { loading: false, data: null };
    });

    const { getByText } = render(<StudentHomeScreen onOpenTutorSearch={jest.fn()} />);
    expect(getByText('Mathematics')).toBeTruthy();
    expect(getByText('Offline · Anita Sharma')).toBeTruthy();
  });

  it('shows unscheduled classes after login', () => {
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query.kind === 'credits') {
        return {
          loading: false,
          data: { myClassCredits: [{ id: 12, status: 'unscheduled' }] },
        };
      }
      return { loading: false, data: { studentBookedClassSessions: [] } };
    });

    const onScheduleCredits = jest.fn();
    const { getByText } = render(
      <StudentHomeScreen
        onOpenTutorSearch={jest.fn()}
        onScheduleCredits={onScheduleCredits}
      />,
    );
    fireEvent.press(getByText('1 class to schedule'));
    expect(onScheduleCredits).toHaveBeenCalled();
  });
});
