import { fireEvent, render, screen } from '@testing-library/react';
import { StudentTutorBookingConfirmPage } from './StudentTutorBookingConfirmPage';

describe('StudentTutorBookingConfirmPage', () => {
  it('directs students to cart checkout instead of legacy book flow', () => {
    const onBooked = jest.fn();
    render(
      <StudentTutorBookingConfirmPage
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

    expect(screen.getByRole('heading', { name: 'Use your class credits' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(onBooked).toHaveBeenCalledTimes(1);
  });
});
