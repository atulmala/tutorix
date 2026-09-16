import { render, screen } from '@testing-library/react';
import { BANK_ACCOUNT_SETUP_REQUIRED_MESSAGE } from '@tutorix/shared-utils';
import { TutorBankSetupPage } from './TutorBankSetupPage';

jest.mock('@tutorix/shared-graphql', () => ({
  GET_MY_TUTOR_DETAIL: {},
  GET_MY_TUTOR_PROFILE: {},
  SAVE_MY_BANK_DETAILS: {},
}));

jest.mock('@apollo/client', () => ({
  useQuery: () => ({ data: null }),
  useMutation: () => [jest.fn(), { loading: false }],
}));

describe('TutorBankSetupPage', () => {
  it('shows the required bank setup copy and has no dismiss control', () => {
    render(<TutorBankSetupPage onComplete={jest.fn()} />);

    expect(screen.getByText('Account setup')).toBeTruthy();
    expect(screen.getByText(BANK_ACCOUNT_SETUP_REQUIRED_MESSAGE)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(screen.queryByLabelText('Close')).toBeNull();
  });
});
