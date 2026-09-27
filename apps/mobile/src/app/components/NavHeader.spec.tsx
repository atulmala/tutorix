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

  it('can place the profile avatar on the right without a back button', () => {
    const onProfilePress = jest.fn();
    const { getByLabelText } = render(
      <NavHeader
        title="Search"
        userInitials="SD"
        onProfilePress={onProfilePress}
        profileAlign="right"
        onLogout={jest.fn()}
      />,
    );

    fireEvent.press(getByLabelText('Open profile'));
    expect(onProfilePress).toHaveBeenCalledTimes(1);
  });

  it('keeps the profile avatar when back is shown', () => {
    const onProfilePress = jest.fn();
    const { getByLabelText } = render(
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
    fireEvent.press(getByLabelText('Open profile'));
    expect(onProfilePress).toHaveBeenCalledTimes(1);
  });
});
