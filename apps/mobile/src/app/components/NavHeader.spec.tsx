import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { NavHeader } from './NavHeader';

describe('NavHeader', () => {
  it('calls onProfilePress when the left avatar is tapped', () => {
    const onProfilePress = jest.fn();
    const { getByLabelText } = render(
      <NavHeader
        title="Home"
        userInitials="SD"
        onProfilePress={onProfilePress}
        onLogout={jest.fn()}
      />,
    );

    fireEvent.press(getByLabelText('Open profile'));
    expect(onProfilePress).toHaveBeenCalledTimes(1);
  });

  it('renders the slot immediately before logout', () => {
    const { getByText, getByLabelText } = render(
      <NavHeader
        title="Home"
        onLogout={jest.fn()}
        rightBeforeLogout={<Text>Wallet chip</Text>}
      />,
    );

    expect(getByText('Wallet chip')).toBeTruthy();
    expect(getByLabelText('Logout')).toBeTruthy();
  });

  it('hides the profile avatar when back is shown', () => {
    const onProfilePress = jest.fn();
    const { getByLabelText, queryByLabelText, queryByText } = render(
      <NavHeader
        title="My profile"
        userInitials="SD"
        avatarUrl="https://example.com/avatar.png"
        onProfilePress={onProfilePress}
        onBack={jest.fn()}
        onLogout={jest.fn()}
      />,
    );

    expect(getByLabelText('Go back')).toBeTruthy();
    expect(queryByLabelText('Open profile')).toBeNull();
    expect(queryByText('SD')).toBeNull();
  });
});
