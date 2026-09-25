import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MY_WALLET, TUTOR_SEARCH_DETAIL } from '@tutorix/shared-graphql/queries';
import { StudentTutorBookingConfirmScreen } from './StudentTutorBookingConfirmScreen';

const mockUseQuery = jest.fn();
const mockBook = jest.fn();

jest.mock('@tutorix/shared-graphql/mutations', () => ({
  BOOK_TUTOR_CLASS: { kind: 'book' },
}));

jest.mock('@tutorix/shared-graphql/queries', () => ({
  TUTOR_SEARCH_DETAIL: { kind: 'detail' },
  MY_WALLET: { kind: 'wallet' },
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

describe('StudentTutorBookingConfirmScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockBook.mockReset();
    mockBook.mockResolvedValue({ data: { bookTutorClass: { sessionId: '90' } } });
  });

  it('pays from wallet when the balance covers the class', () => {
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
              },
            },
          },
        };
      }
      if (query === MY_WALLET) {
        return { loading: false, data: { myWallet: { balanceInr: 800 } } };
      }
      return { loading: false, data: null };
    });

    const { getByText } = render(
      <StudentTutorBookingConfirmScreen
        draft={draft}
        onBooked={jest.fn()}
        onOpenWallet={jest.fn()}
      />,
    );

    expect(getByText('Anita Sharma')).toBeTruthy();
    expect(getByText('1 hour')).toBeTruthy();
    fireEvent.press(getByText('Pay ₹500'));
    expect(mockBook).toHaveBeenCalled();
  });
});
