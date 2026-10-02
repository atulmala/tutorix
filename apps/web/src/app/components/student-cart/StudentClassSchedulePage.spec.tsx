import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StudentClassSchedulePage } from './StudentClassSchedulePage';
import type { StudentClassCredit } from './StudentClassCreditsPage';

const mockScheduleCredit = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  MY_CLASS_CREDITS: { kind: 'credits' },
  SCHEDULE_CLASS_CREDIT: { kind: 'schedule' },
  RESCHEDULE_CLASS_CREDIT: { kind: 'reschedule' },
}));

jest.mock('@apollo/client', () => ({
  useMutation: () => [mockScheduleCredit, { loading: false }],
}));

jest.mock('../student-tutor-booking/StudentTutorBookingPage', () => ({
  StudentTutorBookingPage: ({
    onContinue,
  }: {
    onContinue: (draft: { tutorCalendarId: string }) => void;
  }) => (
    <button type="button" onClick={() => onContinue({ tutorCalendarId: '90' })}>
      Save slot
    </button>
  ),
}));

const credit = (id: number): StudentClassCredit => ({
  id,
  tutorId: 3,
  offeringId: 30,
  tutorOfferingId: 80,
  tutorName: 'Anita Sharma',
  offeringLabel: 'CBSE Mathematics Class 11',
  deliveryMode: 'offline',
  status: 'unscheduled',
});

describe('StudentClassSchedulePage', () => {
  beforeEach(() => {
    mockScheduleCredit.mockReset();
    mockScheduleCredit.mockResolvedValue({});
  });

  it('keeps the student on the picker until every class in the pack has a slot', async () => {
    const onScheduled = jest.fn();
    const onScheduleLater = jest.fn();
    render(
      <StudentClassSchedulePage
        credits={[credit(12), credit(13)]}
        onScheduled={onScheduled}
        onScheduleLater={onScheduleLater}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'I will schedule later' }));
    expect(onScheduleLater).toHaveBeenCalledTimes(1);

    expect(screen.getByText('2 classes left to schedule')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save slot' }));

    await waitFor(() => {
      expect(screen.getByText('1 class left to schedule')).toBeTruthy();
    });
    expect(mockScheduleCredit).toHaveBeenCalledWith({
      variables: { creditId: '12', tutorCalendarId: '90' },
    });
    expect(onScheduled).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save slot' }));
    await waitFor(() => {
      expect(onScheduled).toHaveBeenCalledTimes(1);
    });
    expect(mockScheduleCredit).toHaveBeenLastCalledWith({
      variables: { creditId: '13', tutorCalendarId: '90' },
    });
  });
});
