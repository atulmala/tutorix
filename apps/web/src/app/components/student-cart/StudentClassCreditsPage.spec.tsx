import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MY_CLASS_CREDITS } from '@tutorix/shared-graphql';
import { StudentClassCreditsPage } from './StudentClassCreditsPage';

const mockUseQuery = jest.fn();
const mockCancelClassCredits = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  MY_CLASS_CREDITS: { kind: 'credits' },
  MY_WALLET: { kind: 'wallet' },
  CANCEL_CLASS_CREDITS: { kind: 'cancel' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [mockCancelClassCredits, { loading: false }],
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
    const onScheduleLater = jest.fn();
    render(
      <StudentClassCreditsPage onSchedule={onSchedule} onScheduleLater={onScheduleLater} />,
    );

    expect(screen.getAllByText('1 class to schedule').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'I will schedule later' }));
    expect(onScheduleLater).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Pick a slot' }));
    expect(onSchedule).toHaveBeenCalledWith([
      expect.objectContaining({ id: 12, status: 'unscheduled' }),
    ]);
  });

  it('shows one card for several unscheduled classes of the same booking', () => {
    const pack = [12, 13, 14, 15].map((id) => ({
      id,
      tutorId: 3,
      offeringId: 30,
      tutorOfferingId: 80,
      tutorName: 'Anita Sharma',
      offeringLabel: 'CBSE Mathematics Class 11',
      deliveryMode: 'offline',
      status: 'unscheduled',
    }));
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === MY_CLASS_CREDITS) {
        return { loading: false, data: { myClassCredits: pack } };
      }
      return { loading: false, data: null };
    });

    const onSchedule = jest.fn();
    render(<StudentClassCreditsPage onSchedule={onSchedule} onScheduleLater={jest.fn()} />);

    expect(screen.getAllByRole('button', { name: 'Pick slots' })).toHaveLength(1);
    expect(screen.getAllByText('4 classes to schedule').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Pick slots' }));
    expect(onSchedule).toHaveBeenCalledWith(pack);
  });

  it('lets the student cancel a pack back to the wallet', async () => {
    const pack = [12, 13].map((id) => ({
      id,
      tutorId: 3,
      offeringId: 30,
      tutorOfferingId: 80,
      tutorName: 'Anita Sharma',
      offeringLabel: 'CBSE Mathematics Class 11',
      deliveryMode: 'offline',
      status: 'unscheduled',
      refundableInr: 500,
    }));
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === MY_CLASS_CREDITS) {
        return { loading: false, data: { myClassCredits: pack } };
      }
      return { loading: false, data: null };
    });
    mockCancelClassCredits.mockResolvedValue({});

    render(<StudentClassCreditsPage onSchedule={jest.fn()} onScheduleLater={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel classes' }));
    expect(screen.getByRole('dialog', { name: 'Cancel classes' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add ₹1,000 to wallet' }));

    expect(mockCancelClassCredits).toHaveBeenCalledWith({
      variables: {
        creditIds: ['12', '13'],
        refundMethod: 'wallet',
      },
    });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Cancel classes' })).toBeNull();
    });
  });
});
