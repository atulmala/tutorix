import React from 'react';
import { render } from '@testing-library/react-native';
import { RATE_CARD_SETUP_REQUIRED_MESSAGE } from '@tutorix/shared-utils/rate-card';

jest.mock('@tutorix/shared-graphql/queries', () => ({
  GET_MY_TUTOR_DETAIL: {},
  GET_MY_TUTOR_PROFILE: {},
}));
jest.mock('@tutorix/shared-graphql/mutations', () => ({
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

import { TutorRateCardSetupScreen } from './TutorRateCardSetupScreen';

describe('TutorRateCardSetupScreen', () => {
  it('shows the required rate card copy and has no dismiss control', () => {
    const { getByText, queryByText, queryByLabelText } = render(
      <TutorRateCardSetupScreen onComplete={jest.fn()} />,
    );

    expect(getByText('Rate card')).toBeTruthy();
    expect(getByText(RATE_CARD_SETUP_REQUIRED_MESSAGE)).toBeTruthy();
    expect(getByText('Save rate card')).toBeTruthy();
    expect(queryByText('Cancel')).toBeNull();
    expect(queryByLabelText('Close')).toBeNull();
  });
});
