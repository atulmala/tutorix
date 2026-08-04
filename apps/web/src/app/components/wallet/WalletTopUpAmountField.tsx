import React from 'react';

type WalletTopUpAmountFieldProps = {
  value: number;
  minAmount: number;
  maxAmount?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export const WalletTopUpAmountField: React.FC<WalletTopUpAmountFieldProps> = ({
  value,
  minAmount,
  maxAmount,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor="wallet-top-up-amount" className="block text-sm font-medium text-primary">
        {maxAmount != null ? 'Or enter amount' : 'Amount to add'}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
          ₹
        </span>
        <input
          id="wallet-top-up-amount"
          type="number"
          min={minAmount}
          max={maxAmount}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10);
            onChange(Number.isNaN(next) ? minAmount : next);
          }}
          className="h-11 w-full rounded-lg border border-subtle bg-white pl-8 pr-3 text-sm text-primary outline-none ring-sky-200 focus:ring-2"
        />
      </div>
      <p className="text-xs text-muted">
        {maxAmount != null
          ? `Between ₹${minAmount.toLocaleString('en-IN')} and ₹${maxAmount.toLocaleString('en-IN')}.`
          : `Minimum ₹${minAmount}. You can add a higher amount.`}
      </p>
    </div>
  );
};
