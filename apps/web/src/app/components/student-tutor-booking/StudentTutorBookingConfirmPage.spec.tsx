import { fireEvent, render, screen } from '@testing-library/react';
import { MY_WALLET, TUTOR_SEARCH_DETAIL } from '@tutorix/shared-graphql';
import { StudentTutorBookingConfirmPage } from './StudentTutorBookingConfirmPage';

const mockUseQuery = jest.fn();
const mockBook = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  TUTOR_SEARCH_DETAIL: { kind: 'detail' },
  MY_WALLET: { kind: 'wallet' },
  BOOK_TUTOR_CLASS: { kind: 'book' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [mockBook, { loading: false }],
}));

const draft = {
  tutorId: '3',
  offeringId: '30',
  tutorCalendarId: '11',
  deliveryMode: 'offline' as const,
  startsAt: '2026-09-24T11:30:00.000Z',
};

describe('StudentTutorBookingConfirmPage', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockBook.mockReset();
    mockBook.mockResolvedValue({ data: { bookTutorClass: { sessionId: '90' } } });
  });

  function mockQueries(balance: number) {
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === TUTOR_SEARCH_DETAIL) {
        return {
          loading: false,
          data: {
            tutorSearchDetail: {
              displayName: 'Anita Sharma',
              matchingOffering: {
                offeringLabel: 'CBSE · Class 8 · Mathematics',
                offlineRateInr: 500,
                onlineRateInr: 400,
              },
            },
          },
        };
      }
      if (query === MY_WALLET) {
        return { loading: false, data: { myWallet: { balanceInr: balance } } };
      }
      return { loading: false, data: null };
    });
  }

  it('pays from wallet when the balance covers the class', () => {
    mockQueries(800);
    const onBooked = jest.fn();
    render(
      <StudentTutorBookingConfirmPage
        draft={draft}
        onBooked={onBooked}
        onOpenWallet={jest.fn()}
      />,
    );

    expect(screen.getByText('Anita Sharma')).toBeTruthy();
    expect(screen.getByText('1 hour')).toBeTruthy();
    expect(screen.getByText('Wallet balance ₹800')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₹500' }));
    expect(mockBook).toHaveBeenCalled();
  });

  it('opens wallet top-up when the balance is short', () => {
    mockQueries(100);
    const onOpenWallet = jest.fn();
    render(
      <StudentTutorBookingConfirmPage
        draft={draft}
        onBooked={jest.fn()}
        onOpenWallet={onOpenWallet}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add money to wallet' }));
    expect(onOpenWallet).toHaveBeenCalled();
  });
});
