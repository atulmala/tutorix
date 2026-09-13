import React from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { fireEvent, render } from '@testing-library/react-native';
import { AccountLegalSection } from './AccountLegalSection';

describe('AccountLegalSection', () => {
  it('shows Change password above Delete account', () => {
    const { getByLabelText } = render(
      <MockedProvider>
        <AccountLegalSection onAccountDeleted={jest.fn()} />
      </MockedProvider>,
    );

    const change = getByLabelText('Change password');
    const remove = getByLabelText('Delete account');
    expect(change).toBeTruthy();
    expect(remove).toBeTruthy();

    fireEvent.press(change);
    expect(getByLabelText('Current password')).toBeTruthy();
  });
});
