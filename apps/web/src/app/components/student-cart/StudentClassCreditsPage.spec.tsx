import { fireEvent, render, screen } from '@testing-library/react';
import { MY_CLASS_CREDITS } from '@tutorix/shared-graphql';
import { StudentClassCreditsPage } from './StudentClassCreditsPage';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  MY_CLASS_CREDITS: { kind: 'credits' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

describe('StudentClassCreditsPage', () => {
  it('lets the student pick an unscheduled class', () => {
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === MY_CLASS_CREDITS) {
        return {
          loading: false,
          data: {
            myClassCredits: [
              {
                id: 12,
                tutorId: 3,
                offeringId: 30,
                tutorOfferingId: 80,
                tutorName: 'Anita Sharma',
                offeringLabel: 'Mathematics',
                deliveryMode: 'offline',
                status: 'unscheduled',
              },
            ],
          },
        };
      }
      return { loading: false, data: null };
    });

    const onSchedule = jest.fn();
    render(<StudentClassCreditsPage onSchedule={onSchedule} />);

    expect(screen.getByText('1 class to schedule')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pick a slot' }));
    expect(onSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ id: 12, status: 'unscheduled' }),
    );
  });
});
