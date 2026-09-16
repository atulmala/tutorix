import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@tutorix/shared-graphql/queries', () => ({
  GET_MY_TUTOR_DETAIL: {},
  GET_MY_TUTOR_PROFILE: {},
}));
jest.mock('@tutorix/shared-graphql/mutations', () => ({
  SAVE_MY_BANK_DETAILS: {},
}));
jest.mock('@apollo/client', () => ({
  useQuery: () => ({ data: null }),
  useMutation: () => [jest.fn(), { loading: false }],
}));

import { TutorBankSetupScreen } from './TutorBankSetupScreen';

describe('TutorBankSetupScreen', () => {
  it('shows the required bank setup copy and has no dismiss control', () => {
    const { getByText, queryByText, queryByLabelText } = render(
      <TutorBankSetupScreen onComplete={jest.fn()} />,
    );

    expect(getByText('Account setup')).toBeTruthy();
    expect(
      getByText(
        'Please set up your bank account. Its where you will receive your payments',
      ),
    ).toBeTruthy();
    expect(getByText('Save')).toBeTruthy();
    expect(queryByText('Cancel')).toBeNull();
    expect(queryByLabelText('Close')).toBeNull();
  });
});
