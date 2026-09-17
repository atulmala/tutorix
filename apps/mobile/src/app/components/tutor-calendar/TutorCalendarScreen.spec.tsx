import React from 'react';
import { render } from '@testing-library/react-native';
import { TutorCalendarScreen } from './TutorCalendarScreen';

jest.mock('@tutorix/shared-graphql/queries', () => ({
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

jest.mock('../tutor-profile/TutorAvailabilitySection', () => ({
  TutorAvailabilitySection: () => {
    const { Text } = require('react-native');
    return <Text>Availability calendar</Text>;
  },
}));

describe('TutorCalendarScreen', () => {
  it('shows the availability calendar', () => {
    const { getByText } = render(<TutorCalendarScreen />);
    expect(getByText('Availability calendar')).toBeTruthy();
  });
});
