import React from 'react';
import {
  WALLET_STANDALONE_TOP_UP_MAX_INR,
  WALLET_STANDALONE_TOP_UP_MIN_INR,
  WALLET_STANDALONE_TOP_UP_PRESETS_INR,
} from '@tutorix/shared-utils';
import { WalletTopUpAmountField } from './WalletTopUpAmountField';

type WalletTopUpDialogProps = {
  open: boolean;
  topUpAmount: number;
  loading?: boolean;
  error?: string | null;
  onTopUpAmountChange: (amount: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export const WalletTopUpDialog: React.FC<WalletTopUpDialogProps> = ({
  open,
  topUpAmount,
  loading = false,
  error,
  onTopUpAmountChange,
  onConfirm,
  onCancel,
}) => {
  if (!open) {
    return null;
  }

  const canConfirm =
    topUpAmount >= WALLET_STANDALONE_TOP_UP_MIN_INR &&
    topUpAmount <= WALLET_STANDALONE_TOP_UP_MAX_INR &&
    !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-top-up-title"
        className="w-full max-w-md rounded-2xl border border-subtle bg-white p-6 shadow-xl"
      >
        <h2 id="wallet-top-up-title" className="text-lg font-semibold text-primary">
          Top up wallet
        </h2>
        <p className="mt-2 text-sm text-muted">
          Add money to your wallet for future payments. Minimum ₹
          {WALLET_STANDALONE_TOP_UP_MIN_INR}, maximum ₹
          {WALLET_STANDALONE_TOP_UP_MAX_INR.toLocaleString('en-IN')}.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {WALLET_STANDALONE_TOP_UP_PRESETS_INR.map((preset) => {
            const selected = topUpAmount === preset;
            return (
              <button
                key={preset}
                type="button"
                disabled={loading}
                onClick={() => onTopUpAmountChange(preset)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? 'border-sky-500 bg-sky-50 text-sky-900'
                    : 'border-subtle bg-white text-primary hover:bg-gray-50'
                }`}
              >
                ₹{preset.toLocaleString('en-IN')}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <WalletTopUpAmountField
            value={topUpAmount}
            minAmount={WALLET_STANDALONE_TOP_UP_MIN_INR}
            maxAmount={WALLET_STANDALONE_TOP_UP_MAX_INR}
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
            {loading ? 'Processing…' : `Pay ₹${topUpAmount.toLocaleString('en-IN')}`}
          </button>
        </div>
      </div>
    </div>
  );
};
