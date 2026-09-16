import { render, screen } from '@testing-library/react';
import { RATE_CARD_SETUP_REQUIRED_MESSAGE } from '@tutorix/shared-utils';
import { TutorRateCardSetupPage } from './TutorRateCardSetupPage';

jest.mock('@tutorix/shared-graphql', () => ({
  GET_MY_TUTOR_DETAIL: {},
  GET_MY_TUTOR_PROFILE: {},
  SAVE_MY_TUTOR_OFFERING_RATE_CARD: {},
}));

jest.mock('@apollo/client', () => ({
  useQuery: () => ({
    loading: false,
    data: {
      myTutorDetail: {
        offerings: [
          {
            id: 63,
            offeringDisplayName: 'Mathematics',
            offeringFullLabel: 'CBSE • Class 12 • Mathematics',
            status: 'pt_passed',
            rateCard: null,
          },
        ],
      },
    },
  }),
  useMutation: () => [jest.fn(), { loading: false }],
}));

describe('TutorRateCardSetupPage', () => {
  it('shows the required rate card copy and has no dismiss control', () => {
    render(<TutorRateCardSetupPage onComplete={jest.fn()} />);

    expect(screen.getByText('Rate card')).toBeTruthy();
    expect(screen.getByText(RATE_CARD_SETUP_REQUIRED_MESSAGE)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save rate card' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(screen.queryByLabelText('Close')).toBeNull();
  });
});
