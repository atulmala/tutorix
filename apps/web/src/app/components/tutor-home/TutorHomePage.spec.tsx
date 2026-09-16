import { render, screen } from '@testing-library/react';
import { TutorHomePage } from './TutorHomePage';

describe('TutorHomePage', () => {
  it('shows the schedule hub instead of the coming-soon placeholder', () => {
    render(<TutorHomePage />);

    expect(screen.getByText('My schedule')).toBeTruthy();
    expect(screen.getByText("Today's classes")).toBeTruthy();
    expect(screen.getByText('Teaching hours')).toBeTruthy();
    expect(screen.getByText('Concluded classes')).toBeTruthy();
    expect(screen.getByText('MON')).toBeTruthy();
    expect(
      screen.queryByText(
        'Manage bookings, students, and your teaching schedule — coming soon.',
      ),
    ).toBeNull();
  });
});
