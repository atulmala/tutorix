import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StudentTabBar } from './StudentTabBar';

describe('StudentTabBar', () => {
  it('renders four tabs', () => {
    const { getByLabelText } = render(
      <StudentTabBar
        active="home"
        onHome={jest.fn()}
        onSearch={jest.fn()}
        onWallet={jest.fn()}
        onProfile={jest.fn()}
      />,
    );

    expect(getByLabelText('Home')).toBeTruthy();
    expect(getByLabelText('Search')).toBeTruthy();
    expect(getByLabelText('Wallet')).toBeTruthy();
    expect(getByLabelText('Profile')).toBeTruthy();
  });

  it('marks the active tab as selected', () => {
    const { getByLabelText } = render(
      <StudentTabBar
        active="wallet"
        onHome={jest.fn()}
        onSearch={jest.fn()}
        onWallet={jest.fn()}
        onProfile={jest.fn()}
      />,
    );

    expect(getByLabelText('Wallet').props.accessibilityState?.selected).toBe(
      true,
    );
    expect(getByLabelText('Home').props.accessibilityState?.selected).toBe(
      false,
    );
  });

  it('invokes tab handlers on press', () => {
    const onHome = jest.fn();
    const onSearch = jest.fn();
    const onWallet = jest.fn();
    const onProfile = jest.fn();
    const { getByLabelText } = render(
      <StudentTabBar
        active={null}
        onHome={onHome}
        onSearch={onSearch}
        onWallet={onWallet}
        onProfile={onProfile}
      />,
    );

    fireEvent.press(getByLabelText('Search'));
    fireEvent.press(getByLabelText('Profile'));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onProfile).toHaveBeenCalledTimes(1);
    expect(onHome).not.toHaveBeenCalled();
    expect(onWallet).not.toHaveBeenCalled();
  });
});
