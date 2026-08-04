import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CONFIRM_WALLET_TOP_UP,
  INITIATE_WALLET_TOP_UP,
  MY_WALLET,
  MY_WALLET_TRANSACTIONS,
} from '@tutorix/shared-graphql';
import {
  runStandaloneWalletTopUp,
  WALLET_STANDALONE_TOP_UP_PRESETS_INR,
} from '@tutorix/shared-utils';
import { WalletTopUpDialog } from './WalletTopUpDialog';

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
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(
    WALLET_STANDALONE_TOP_UP_PRESETS_INR[0],
  );
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  const { data: walletData, loading: walletLoading, refetch: refetchWallet } =
    useQuery(MY_WALLET, {
      fetchPolicy: 'cache-and-network',
    });
  const {
    data: txData,
    loading: txLoading,
    refetch: refetchTransactions,
  } = useQuery<MyWalletTransactionsData>(MY_WALLET_TRANSACTIONS, {
    variables: { first: 50, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const [initiateWalletTopUp] = useMutation(INITIATE_WALLET_TOP_UP);
  const [confirmWalletTopUp] = useMutation(CONFIRM_WALLET_TOP_UP);

  const balance = walletData?.myWallet?.balanceInr ?? 0;
  const transactions: WalletTransactionItem[] =
    txData?.myWalletTransactions?.items ?? [];

  const handleOpenTopUp = () => {
    setTopUpAmount(WALLET_STANDALONE_TOP_UP_PRESETS_INR[0]);
    setTopUpError(null);
    setShowTopUpDialog(true);
  };

  const handleConfirmTopUp = async () => {
    setTopUpError(null);
    setTopUpLoading(true);
    try {
      await runStandaloneWalletTopUp(
        topUpAmount,
        async (input) => {
          const response = await initiateWalletTopUp({ variables: { input } });
          return response.data?.initiateWalletTopUp ?? null;
        },
        async (input) => {
          const response = await confirmWalletTopUp({ variables: { input } });
          return response.data?.confirmWalletTopUp ?? { wallet: { balanceInr: 0 } };
        },
      );
      setShowTopUpDialog(false);
      await Promise.all([refetchWallet(), refetchTransactions()]);
    } catch (error) {
      setTopUpError(
        error instanceof Error
          ? error.message
          : 'Could not complete top-up. Try again or contact support.',
      );
    } finally {
      setTopUpLoading(false);
    }
  };

  return (
    <>
      <WalletTopUpDialog
        open={showTopUpDialog}
        topUpAmount={topUpAmount}
        loading={topUpLoading}
        error={topUpError}
        onTopUpAmountChange={setTopUpAmount}
        onConfirm={() => void handleConfirmTopUp()}
        onCancel={() => {
          if (topUpLoading) return;
          setShowTopUpDialog(false);
          setTopUpError(null);
        }}
      />
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-sky-900">Current balance</p>
              <p className="mt-1 text-3xl font-bold text-sky-950">
                {walletLoading ? '…' : `₹${balance}`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenTopUp}
              className="h-10 rounded-lg bg-[#5fa8ff] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
            >
              Top up wallet
            </button>
          </div>
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
    </>
  );
};
