import { render, screen } from '@testing-library/react';
import { TutorCalendarPage } from './TutorCalendarPage';

jest.mock('@tutorix/shared-graphql', () => ({
  GET_MY_TUTOR_DETAIL: {},
}));

jest.mock('@apollo/client', () => ({
  useQuery: () => ({
    loading: false,
    data: {
      myTutorDetail: {
        canSetAvailability: true,
        offerings: [{ id: 1, status: 'pt_passed' }],
        user: { bankDetails: { isComplete: true } },
      },
    },
  }),
}));

jest.mock('@tutorix/tutor-availability-ui', () => ({
  TutorAvailabilitySection: () => <div>Availability calendar</div>,
}));

describe('TutorCalendarPage', () => {
  it('shows the availability calendar', () => {
    render(<TutorCalendarPage />);
    expect(screen.getByText('Availability calendar')).toBeTruthy();
  });
});
