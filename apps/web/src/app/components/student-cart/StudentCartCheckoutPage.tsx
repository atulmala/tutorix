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
  onPaid: () => void;
  onScheduleNow: () => void;
};

export const StudentCartCheckoutPage: React.FC<StudentCartCheckoutPageProps> = ({
  onPaid,
  onScheduleNow,
}) => {
  const [paid, setPaid] = useState(false);
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
    if (!preview) {
      return;
    }
    setErrorMessage(null);
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
      setPaid(true);
    } catch (payError) {
      setErrorMessage(
        payError instanceof Error ? payError.message : 'Payment failed. Your cart is unchanged.',
      );
    }
  };

  if (loading) {
    return <p className="text-sm text-muted">Preparing checkout…</p>;
  }
  if (error || !preview) {
    return <p className="text-sm text-danger">Could not prepare checkout.</p>;
  }

  if (paid) {
    return (
      <div className="w-full max-w-xl space-y-4">
        <h1 className="text-[26px] font-extrabold text-[#143055]">Classes purchased</h1>
        <p className="text-sm text-slate-500">
          You can pick 1-hour slots now or come back later from home.
        </p>
        <button
          type="button"
          onClick={onScheduleNow}
          className="w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
        >
          Schedule now
        </button>
        <button
          type="button"
          onClick={onPaid}
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#143055]"
        >
          Later
        </button>
      </div>
    );
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
      {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}
      <button
        type="button"
        onClick={() => void pay()}
        className="w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
      >
        Pay {formatInr(preview.purchaseAmountInr)}
      </button>
    </div>
  );
};
