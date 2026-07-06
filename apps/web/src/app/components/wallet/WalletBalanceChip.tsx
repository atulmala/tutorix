import React from 'react';
import { useQuery } from '@apollo/client';
import { MY_WALLET } from '@tutorix/shared-graphql';

type WalletBalanceChipProps = {
  onOpenWallet?: () => void;
  className?: string;
};

export const WalletBalanceChip: React.FC<WalletBalanceChipProps> = ({
  onOpenWallet,
  className = '',
}) => {
  const { data, loading, error } = useQuery(MY_WALLET, {
    fetchPolicy: 'cache-and-network',
  });

  if (loading || error || !data?.myWallet) {
    return null;
  }

  const balance = data.myWallet.balanceInr;

  return (
    <button
      type="button"
      onClick={onOpenWallet}
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-0.5 text-xs font-bold text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-600 ${className}`}
      aria-label={`Wallet balance ₹${balance}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        <path d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        <path d="M18 12h2a2 2 0 0 1 0 4h-2" />
      </svg>
      <span>₹{balance}</span>
    </button>
  );
};
