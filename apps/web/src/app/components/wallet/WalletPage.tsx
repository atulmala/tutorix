import React from 'react';
import { useQuery } from '@apollo/client';
import { MY_WALLET, MY_WALLET_TRANSACTIONS } from '@tutorix/shared-graphql';

type WalletPageProps = {
  onBack: () => void;
};

type WalletTransactionItem = {
  id: number;
  createdDate: string;
  type: string;
  amountInr: number;
  balanceAfterInr: number;
  description: string;
  commerceOrderId?: number | null;
};

type MyWalletTransactionsData = {
  myWalletTransactions: {
    hasMore: boolean;
    items: WalletTransactionItem[];
  };
};

function formatTransactionType(type: string): string {
  return type === 'top_up_credit' ? 'Added' : 'Spent';
}

function formatTransactionAmount(type: string, amountInr: number): string {
  return type === 'top_up_credit' ? `+₹${amountInr}` : `-₹${amountInr}`;
}

export const WalletPage: React.FC<WalletPageProps> = ({ onBack }) => {
  const { data: walletData, loading: walletLoading } = useQuery(MY_WALLET, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: txData, loading: txLoading } = useQuery<MyWalletTransactionsData>(
    MY_WALLET_TRANSACTIONS,
    {
      variables: { first: 50, offset: 0 },
      fetchPolicy: 'cache-and-network',
    },
  );

  const balance = walletData?.myWallet?.balanceInr ?? 0;
  const transactions: WalletTransactionItem[] =
    txData?.myWalletTransactions?.items ?? [];

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-subtle bg-white p-6 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Wallet</h1>
          <p className="mt-1 text-sm text-muted">Your balance and transaction history</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="h-10 rounded-lg border border-subtle px-4 text-sm font-semibold text-primary transition hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5">
        <p className="text-sm font-medium text-sky-900">Current balance</p>
        <p className="mt-1 text-3xl font-bold text-sky-950">
          {walletLoading ? '…' : `₹${balance}`}
        </p>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-primary">Transactions</h2>
        {txLoading ? (
          <p className="mt-4 text-sm text-muted">Loading transactions…</p>
        ) : transactions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No transactions yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-subtle rounded-xl border border-subtle">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-primary">{tx.description}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatTransactionType(tx.type)} ·{' '}
                    {new Date(tx.createdDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      tx.type === 'top_up_credit' ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {formatTransactionAmount(tx.type, tx.amountInr)}
                  </p>
                  <p className="mt-1 text-xs text-muted">Bal ₹{tx.balanceAfterInr}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
