import { fireEvent, render, screen } from '@testing-library/react';
import {
  istHomeScheduleDays,
  PENDING_CALENDAR_TASK_ACTION,
  PENDING_CALENDAR_TASK_MESSAGE,
  PENDING_RATE_CARD_TASK_ACTION,
  PENDING_RATE_CARD_TASK_MESSAGE,
} from '@tutorix/shared-utils';
import { GET_MY_TUTOR_CALENDAR_UPDATED_TILL, GET_MY_TUTOR_DETAIL } from '@tutorix/shared-graphql';
import { TutorHomePage } from './TutorHomePage';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
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
    expect(screen.getByText('Concluded classes')).toBeTruthy();
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
});
