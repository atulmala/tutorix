import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StudentTutorBookingConfirmScreen } from './StudentTutorBookingConfirmScreen';

describe('StudentTutorBookingConfirmScreen', () => {
  it('directs students to cart checkout instead of legacy book flow', () => {
    const onBooked = jest.fn();
    render(
      <StudentTutorBookingConfirmScreen
        draft={{
          tutorId: '3',
          offeringId: '30',
          tutorCalendarId: '11',
          deliveryMode: 'offline',
          startsAt: new Date().toISOString(),
        }}
        onBooked={onBooked}
        onOpenWallet={jest.fn()}
      />,
    );

    expect(screen.getByText('Use your class credits')).toBeTruthy();
    fireEvent.press(screen.getByText('Go back'));
    expect(onBooked).toHaveBeenCalledTimes(1);
  });
});
