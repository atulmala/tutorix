import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PREPARE_CART_CHECKOUT } from '@tutorix/shared-graphql';
import { runWalletAwarePurchaseCheckout } from '@tutorix/shared-utils';
import { StudentCartCheckoutPage } from './StudentCartCheckoutPage';

const mockUseQuery = jest.fn();
const mockUseLazyQuery = jest.fn();
const mockUseMutation = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  PREPARE_CART_CHECKOUT: { kind: 'prepare' },
  PREPARE_WALLET_PURCHASE: { kind: 'wallet-prepare' },
  COMPLETE_WALLET_PURCHASE: { kind: 'complete' },
  INITIATE_WALLET_TOP_UP: { kind: 'topup' },
  CONFIRM_WALLET_TOP_UP: { kind: 'confirm' },
  MY_CART: { kind: 'cart' },
  MY_CLASS_CREDITS: { kind: 'credits' },
  MY_ORDER_INVOICE: { kind: 'invoice' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useLazyQuery: (...args: unknown[]) => mockUseLazyQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

jest.mock('@tutorix/shared-utils', () => {
  const actual = jest.requireActual('@tutorix/shared-utils');
  return {
    ...actual,
    runWalletAwarePurchaseCheckout: jest.fn(),
  };
});

describe('StudentCartCheckoutPage', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseLazyQuery.mockReset();
    mockUseMutation.mockReset();
    mockUseLazyQuery.mockReturnValue([jest.fn()]);
    mockUseMutation.mockReturnValue([jest.fn(), { loading: false }]);
    (runWalletAwarePurchaseCheckout as jest.Mock).mockReset();
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query.kind === 'invoice') {
        return {
          loading: false,
          data: {
            myOrderInvoice: {
              invoiceNumber: 'INV202609TEST',
              amountPaidInr: 1000,
              pdfUrl: 'https://example.com/invoice.pdf',
            },
          },
        };
      }
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
  });

  it('pays the cart and opens class scheduling', async () => {
    let resolvePay: (value: unknown) => void = () => undefined;
    (runWalletAwarePurchaseCheckout as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePay = resolve;
        }),
    );
    const onScheduleNow = jest.fn();
    render(<StudentCartCheckoutPage onScheduleNow={onScheduleNow} />);

    expect(screen.getByText('Mathematics')).toBeTruthy();
    expect(screen.getByText(/Razorpay will add ₹800/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₹1,000' }));

    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: 'Processing payment' }) as HTMLButtonElement)
          .disabled,
      ).toBe(true);
    });

    resolvePay({
      walletBalanceInr: 0,
      usedGateway: true,
      purchaseOrderId: 42,
      purchaseOrderNumber: 'TX250926ABC',
    });

    await waitFor(() => {
      expect(onScheduleNow).toHaveBeenCalledTimes(1);
    });
    expect(runWalletAwarePurchaseCheckout).toHaveBeenCalledWith(
      { itemType: 'CLASS_BOOKING', referenceType: 'cart', referenceId: 5 },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('shows the gateway error and a retry action', async () => {
    (runWalletAwarePurchaseCheckout as jest.Mock).mockRejectedValue(
      new Error('Payment failed. Please try again.'),
    );
    render(<StudentCartCheckoutPage onScheduleNow={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pay ₹1,000' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Payment failed. Please try again.',
    );
    expect(
      (screen.getByRole('button', { name: 'Retry payment' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });
});
