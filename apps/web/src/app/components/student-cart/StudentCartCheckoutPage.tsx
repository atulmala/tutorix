import React, { useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import {
  COMPLETE_WALLET_PURCHASE,
  CONFIRM_WALLET_TOP_UP,
  INITIATE_WALLET_TOP_UP,
  MY_CART,
  MY_CLASS_CREDITS,
  PREPARE_CART_CHECKOUT,
  PREPARE_WALLET_PURCHASE,
} from '@tutorix/shared-graphql';
import {
  formatInr,
  runWalletAwarePurchaseCheckout,
  type WalletPurchaseIntent,
  type WalletPurchasePreview,
} from '@tutorix/shared-utils';

type CheckoutItem = {
  id: number;
  tutorName: string;
  offeringLabel: string;
  deliveryMode: 'online' | 'offline';
  quantity: number;
  lineTotalInr: number;
};

type StudentCartCheckoutPageProps = {
  onScheduleNow: () => void;
};

export const StudentCartCheckoutPage: React.FC<StudentCartCheckoutPageProps> = ({
  onScheduleNow,
}) => {
  const [paying, setPaying] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data, loading, error } = useQuery(PREPARE_CART_CHECKOUT, {
    fetchPolicy: 'network-only',
  });
  const [prepareWalletPurchaseQuery] = useLazyQuery(PREPARE_WALLET_PURCHASE, {
    fetchPolicy: 'network-only',
  });
  const [completeWalletPurchase] = useMutation(COMPLETE_WALLET_PURCHASE, {
    refetchQueries: [{ query: MY_CART }, { query: MY_CLASS_CREDITS }],
  });
  const [initiateWalletTopUp] = useMutation(INITIATE_WALLET_TOP_UP);
  const [confirmWalletTopUp] = useMutation(CONFIRM_WALLET_TOP_UP, {
    refetchQueries: [{ query: MY_CART }, { query: MY_CLASS_CREDITS }],
  });
  const preview = data?.prepareCartCheckout;
  const items = (preview?.items ?? []) as CheckoutItem[];

  const pay = async () => {
    if (!preview || paying) {
      return;
    }
    setErrorMessage(null);
    setPaymentFailed(false);
    setPaying(true);
    const purchaseIntent: WalletPurchaseIntent = {
      itemType: 'CLASS_BOOKING',
      referenceType: 'cart',
      referenceId: preview.cartId,
    };
    try {
      await runWalletAwarePurchaseCheckout(
        purchaseIntent,
        async (intent) => {
          const response = await prepareWalletPurchaseQuery({
            variables: { input: { purchaseIntent: intent } },
          });
          const walletPreview = response.data?.prepareWalletPurchase;
          if (!walletPreview) {
            throw new Error('Could not prepare wallet purchase');
          }
          return walletPreview as WalletPurchasePreview;
        },
        async (intent) => {
          const response = await completeWalletPurchase({
            variables: { purchaseIntent: intent },
          });
          return response.data?.completeWalletPurchase ?? { wallet: { balanceInr: 0 } };
        },
        async (input) => {
          const response = await initiateWalletTopUp({ variables: { input } });
          return response.data?.initiateWalletTopUp ?? null;
        },
        async (input) => {
          const response = await confirmWalletTopUp({ variables: { input } });
          return response.data?.confirmWalletTopUp ?? { wallet: { balanceInr: 0 } };
        },
        async (walletPreview) => walletPreview.shortfallInr,
      );
      onScheduleNow();
    } catch (payError) {
      setPaymentFailed(true);
      setErrorMessage(
        payError instanceof Error ? payError.message : 'Payment failed. Your cart is unchanged.',
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted">Preparing checkout…</p>;
  }
  if (error || !preview) {
    return <p className="text-sm text-danger">Could not prepare checkout.</p>;
  }

  return (
    <div className="w-full max-w-xl space-y-4">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Checkout</h1>
      <ul className="space-y-3 rounded-[20px] bg-white p-5">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-[#143055]">{item.offeringLabel}</p>
              <p className="mt-0.5 text-sm text-slate-500">
                {item.tutorName} · {item.deliveryMode === 'online' ? 'Online' : 'Offline'} ·{' '}
                {item.quantity} {item.quantity === 1 ? 'class' : 'classes'}
              </p>
            </div>
            <span className="text-sm font-extrabold text-[#143055]">
              {formatInr(item.lineTotalInr)}
            </span>
          </li>
        ))}
      </ul>
      <div className="rounded-[20px] bg-white px-5 py-4 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Wallet</span>
          <span className="font-extrabold text-[#143055]">
            {formatInr(preview.walletBalanceInr)}
          </span>
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-slate-500">Total</span>
          <span className="font-extrabold text-[#143055]">
            {formatInr(preview.purchaseAmountInr)}
          </span>
        </div>
        {!preview.canPayFromWallet ? (
          <p className="mt-2 text-slate-500">
            Razorpay will add {formatInr(preview.shortfallInr)} to your wallet, then the full
            amount is paid from the wallet.
          </p>
        ) : null}
      </div>
      {errorMessage ? (
        <p className="text-sm text-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void pay()}
        disabled={paying}
        aria-busy={paying}
        aria-label={paying ? 'Processing payment' : undefined}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:hover:bg-slate-300"
      >
        {paying ? (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent"
            aria-hidden
          />
        ) : paymentFailed ? (
          'Retry payment'
        ) : (
          `Pay ${formatInr(preview.purchaseAmountInr)}`
        )}
      </button>
    </div>
  );
};
