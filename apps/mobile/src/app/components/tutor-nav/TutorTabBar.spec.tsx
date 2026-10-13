import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TutorTabBar } from './TutorTabBar';

describe('TutorTabBar', () => {
  it('renders four tabs', () => {
    const { getByLabelText } = render(
      <TutorTabBar
        active="home"
        onHome={jest.fn()}
        onCalendar={jest.fn()}
        onWallet={jest.fn()}
        onProfile={jest.fn()}
      />,
    );

    expect(getByLabelText('Home')).toBeTruthy();
    expect(getByLabelText('Calendar')).toBeTruthy();
    expect(getByLabelText('Wallet')).toBeTruthy();
    expect(getByLabelText('Profile')).toBeTruthy();
  });

  it('marks the active tab as selected', () => {
    const { getByLabelText } = render(
      <TutorTabBar
        active="calendar"
        onHome={jest.fn()}
        onCalendar={jest.fn()}
        onWallet={jest.fn()}
        onProfile={jest.fn()}
      />,
    );

    expect(getByLabelText('Calendar').props.accessibilityState?.selected).toBe(
      true,
    );
    expect(getByLabelText('Home').props.accessibilityState?.selected).toBe(
      false,
    );
  });

  it('invokes tab handlers on press', () => {
    const onHome = jest.fn();
    const onCalendar = jest.fn();
    const onWallet = jest.fn();
    const onProfile = jest.fn();
    const { getByLabelText } = render(
      <TutorTabBar
        active={null}
        onHome={onHome}
        onCalendar={onCalendar}
        onWallet={onWallet}
        onProfile={onProfile}
      />,
    );

    fireEvent.press(getByLabelText('Calendar'));
    fireEvent.press(getByLabelText('Wallet'));
    expect(onCalendar).toHaveBeenCalledTimes(1);
    expect(onWallet).toHaveBeenCalledTimes(1);
    expect(onHome).not.toHaveBeenCalled();
    expect(onProfile).not.toHaveBeenCalled();
  });
});
