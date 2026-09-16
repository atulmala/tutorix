import React from 'react';
import { render } from '@testing-library/react-native';
import { TutorHomeScreen } from './TutorHomeScreen';

describe('TutorHomeScreen', () => {
  it('shows the schedule hub instead of the coming-soon placeholder', () => {
    const { getByText, queryByText } = render(<TutorHomeScreen />);

    expect(getByText('My schedule')).toBeTruthy();
    expect(getByText("Today's classes")).toBeTruthy();
    expect(getByText('Teaching hours')).toBeTruthy();
    expect(getByText('Concluded classes')).toBeTruthy();
    expect(getByText('MON')).toBeTruthy();
    expect(
      queryByText('Manage bookings, students, and your teaching schedule — coming soon.'),
    ).toBeNull();
  });
});
