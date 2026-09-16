import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StudentHomeScreen } from './StudentHomeScreen';

describe('StudentHomeScreen', () => {
  it('shows the schedule hub without opening the subject picker', () => {
    const onOpenTutorSearch = jest.fn();
    const { getByText, queryByText } = render(
      <StudentHomeScreen onOpenTutorSearch={onOpenTutorSearch} />,
    );

    expect(getByText('My schedule')).toBeTruthy();
    expect(getByText("Today's classes")).toBeTruthy();
    expect(getByText('Learning hours')).toBeTruthy();
    expect(getByText('Concluded classes')).toBeTruthy();
    expect(getByText('MON')).toBeTruthy();
    expect(getByText('SUN')).toBeTruthy();
    expect(queryByText('What do you want to learn?')).toBeNull();

    fireEvent.press(getByText('Find a tutor'));
    expect(onOpenTutorSearch).toHaveBeenCalled();
  });
});
