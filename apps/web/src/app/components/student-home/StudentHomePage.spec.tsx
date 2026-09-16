import { fireEvent, render, screen } from '@testing-library/react';
import { StudentHomePage } from './StudentHomePage';

describe('StudentHomePage', () => {
  it('shows the schedule hub and opens tutor search', () => {
    const onOpenTutorSearch = jest.fn();
    render(<StudentHomePage onOpenTutorSearch={onOpenTutorSearch} />);

    expect(screen.getByText('My schedule')).toBeTruthy();
    expect(screen.getByText("Today's classes")).toBeTruthy();
    expect(screen.getByText('Learning hours')).toBeTruthy();
    expect(screen.getByText('Concluded classes')).toBeTruthy();
    expect(screen.getByText('MON')).toBeTruthy();
    expect(screen.queryByText('What do you want to learn?')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Find a tutor' }));
    expect(onOpenTutorSearch).toHaveBeenCalledTimes(1);
  });
});
