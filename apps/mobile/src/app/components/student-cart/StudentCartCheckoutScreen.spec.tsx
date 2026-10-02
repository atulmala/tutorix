import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PREPARE_CART_CHECKOUT } from '@tutorix/shared-graphql/queries';
import { runWalletAwarePurchaseCheckout } from '@tutorix/shared-utils/wallet-checkout';
import { openMobilePaymentCheckout } from '../../../lib/mobile-payment-checkout';
import { StudentCartCheckoutScreen } from './StudentCartCheckoutScreen';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql/queries', () => ({
  PREPARE_CART_CHECKOUT: { kind: 'prepare' },
  PREPARE_WALLET_PURCHASE: { kind: 'wallet-prepare' },
  MY_CART: { kind: 'cart' },
  MY_CLASS_CREDITS: { kind: 'credits' },
}));

jest.mock('@tutorix/shared-graphql/mutations', () => ({
  COMPLETE_WALLET_PURCHASE: { kind: 'complete' },
  INITIATE_WALLET_TOP_UP: { kind: 'topup' },
  CONFIRM_WALLET_TOP_UP: { kind: 'confirm' },
  MY_ORDER_INVOICE: { kind: 'invoice' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useLazyQuery: () => [jest.fn()],
  useMutation: () => [jest.fn(), { loading: false }],
}));

jest.mock('@tutorix/shared-utils/wallet-checkout', () => ({
  runWalletAwarePurchaseCheckout: jest.fn(),
}));

jest.mock('../../../lib/mobile-payment-checkout', () => ({
  openMobilePaymentCheckout: jest.fn(),
}));

describe('StudentCartCheckoutScreen', () => {
  it('pays the cart and opens class scheduling', async () => {
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === PREPARE_CART_CHECKOUT) {
        return {
          loading: false,
          data: {
            prepareCartCheckout: {
              cartId: 5,
              purchaseAmountInr: 1000,
              walletBalanceInr: 200,
              shortfallInr: 800,
              canPayFromWallet: false,
              items: [
                {
                  id: 1,
                  tutorName: 'Anita Sharma',
                  offeringLabel: 'Mathematics',
                  deliveryMode: 'offline',
                  quantity: 2,
                  lineTotalInr: 1000,
                },
              ],
            },
          },
        };
      }
      return { loading: false, data: null };
    });
    (runWalletAwarePurchaseCheckout as jest.Mock).mockResolvedValue({
      walletBalanceInr: 0,
      usedGateway: true,
      purchaseOrderNumber: 'TX250926ABC',
    });

    const onScheduleNow = jest.fn();
    const { getByText, getByLabelText } = render(
      <StudentCartCheckoutScreen onScheduleNow={onScheduleNow} />,
    );

    expect(getByText('Mathematics')).toBeTruthy();
    fireEvent.press(getByLabelText('Pay ₹1,000'));
    await waitFor(() => {
      expect(onScheduleNow).toHaveBeenCalledTimes(1);
    });
    expect(runWalletAwarePurchaseCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ itemType: 'CLASS_BOOKING', referenceType: 'cart' }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      openMobilePaymentCheckout,
    );
  });

  it('shows the gateway error and a retry action', async () => {
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === PREPARE_CART_CHECKOUT) {
        return {
          loading: false,
          data: {
            prepareCartCheckout: {
              cartId: 5,
              purchaseAmountInr: 1000,
              walletBalanceInr: 0,
              shortfallInr: 1000,
              canPayFromWallet: false,
              items: [],
            },
          },
        };
      }
      return { loading: false, data: null };
    });
    (runWalletAwarePurchaseCheckout as jest.Mock).mockRejectedValue(
      new Error('Payment failed. Please try again.'),
    );

    const { getByLabelText, findByText } = render(
      <StudentCartCheckoutScreen onScheduleNow={jest.fn()} />,
    );
    fireEvent.press(getByLabelText('Pay ₹1,000'));

    expect(await findByText('Payment failed. Please try again.')).toBeTruthy();
    expect(getByLabelText('Retry payment')).toBeTruthy();
  });
});
