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
import { GET_MY_TUTOR_CALENDAR_UPDATED_TILL, GET_MY_TUTOR_DETAIL } from '@tutorix/shared-graphql/queries';
import { TutorHomeScreen } from './TutorHomeScreen';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql/queries', () => ({
  GET_MY_TUTOR_DETAIL: { kind: 'detail' },
  GET_MY_TUTOR_CALENDAR_UPDATED_TILL: { kind: 'till' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

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
    expect(getByText('Concluded classes')).toBeTruthy();
    expect(getByText('MON')).toBeTruthy();
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
});
