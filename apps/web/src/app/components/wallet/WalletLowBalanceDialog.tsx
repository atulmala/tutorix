import React from 'react';
import type { WalletPurchasePreview } from '@tutorix/shared-utils';
import { formatWalletLowBalanceMessage } from '@tutorix/shared-utils';
import { WalletTopUpAmountField } from './WalletTopUpAmountField';

type WalletLowBalanceDialogProps = {
  open: boolean;
  preview: WalletPurchasePreview | null;
  topUpAmount: number;
  loading?: boolean;
  error?: string | null;
  onTopUpAmountChange: (amount: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export const WalletLowBalanceDialog: React.FC<WalletLowBalanceDialogProps> = ({
  open,
  preview,
  topUpAmount,
  loading = false,
  error,
  onTopUpAmountChange,
  onConfirm,
  onCancel,
}) => {
  if (!open || !preview) {
    return null;
  }

  const canConfirm = topUpAmount >= preview.shortfallInr && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-low-balance-title"
        className="w-full max-w-md rounded-2xl border border-subtle bg-white p-6 shadow-xl"
      >
        <h2 id="wallet-low-balance-title" className="text-lg font-semibold text-primary">
          Wallet balance low
        </h2>
        <p className="mt-2 text-sm text-muted">
          {formatWalletLowBalanceMessage(preview.walletBalanceInr, preview.shortfallInr)}
        </p>
        <p className="mt-1 text-sm text-muted">{preview.purchaseDescription}</p>

        <div className="mt-4">
          <WalletTopUpAmountField
            value={topUpAmount}
            minAmount={preview.shortfallInr}
            onChange={onTopUpAmountChange}
            disabled={loading}
          />
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-10 rounded-lg border border-subtle px-4 text-sm font-semibold text-primary transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="h-10 rounded-lg bg-[#5fa8ff] px-4 text-sm font-semibold text-white transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Processing…' : `Pay ₹${topUpAmount}`}
          </button>
        </div>
      </div>
    </div>
  );
};
