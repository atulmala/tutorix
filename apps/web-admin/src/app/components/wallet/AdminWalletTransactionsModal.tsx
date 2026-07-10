import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, type DocumentNode } from '@apollo/client';

type WalletTransactionItem = {
  id: number;
  createdDate: string;
  type: string;
  amountInr: number;
  balanceAfterInr: number;
  description: string;
  commerceOrderId?: number | null;
};

type WalletBalanceData = {
  adminStudentWallet?: { balanceInr: number } | null;
  adminTutorWallet?: { balanceInr: number } | null;
};

type WalletTransactionsData = {
  adminStudentWalletTransactions?: {
    hasMore: boolean;
    items: WalletTransactionItem[];
  };
  adminTutorWalletTransactions?: {
    hasMore: boolean;
    items: WalletTransactionItem[];
  };
};

type AdminWalletTransactionsModalProps = {
  open: boolean;
  onClose: () => void;
  subjectLabel: string;
  walletQuery: DocumentNode;
  transactionsQuery: DocumentNode;
  variables: { studentId: number } | { tutorId: number };
};

function formatTransactionType(type: string): string {
  return type === 'top_up_credit' ? 'Added' : 'Spent';
}

function formatTransactionAmount(type: string, amountInr: number): string {
  return type === 'top_up_credit' ? `+₹${amountInr}` : `-₹${amountInr}`;
}

export const AdminWalletTransactionsModal: React.FC<
  AdminWalletTransactionsModalProps
> = ({
  open,
  onClose,
  subjectLabel,
  walletQuery,
  transactionsQuery,
  variables,
}) => {
  const { data: walletData, loading: walletLoading } = useQuery<WalletBalanceData>(
    walletQuery,
    {
      variables,
      skip: !open,
      fetchPolicy: 'cache-and-network',
    },
  );
  const { data: txData, loading: txLoading } = useQuery<WalletTransactionsData>(
    transactionsQuery,
    {
      variables: { ...variables, first: 50, offset: 0 },
      skip: !open,
      fetchPolicy: 'cache-and-network',
    },
  );

  if (!open) {
    return null;
  }

  const balance =
    walletData?.adminStudentWallet?.balanceInr ??
    walletData?.adminTutorWallet?.balanceInr ??
    0;
  const transactions: WalletTransactionItem[] =
    txData?.adminStudentWalletTransactions?.items ??
    txData?.adminTutorWalletTransactions?.items ??
    [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-subtle bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-wallet-title"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="admin-wallet-title" className="text-2xl font-bold text-primary">
              Wallet
            </h2>
            <p className="mt-1 text-sm text-muted">
              {subjectLabel} balance and transaction history
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-subtle px-4 text-sm font-semibold text-primary transition hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm font-medium text-sky-900">Current balance</p>
          <p className="mt-1 text-3xl font-bold text-sky-950">
            {walletLoading ? '…' : `₹${balance}`}
          </p>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-primary">Transactions</h3>
          {txLoading ? (
            <p className="mt-4 text-sm text-muted">Loading transactions…</p>
          ) : transactions.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No transactions yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-subtle rounded-xl border border-subtle">
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {tx.description}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatTransactionType(tx.type)} ·{' '}
                      {new Date(tx.createdDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {tx.commerceOrderId != null ? (
                        <>
                          {' · '}
                          <Link
                            to={`/orders/${tx.commerceOrderId}`}
                            className="font-medium text-sky-700 hover:underline"
                            onClick={onClose}
                          >
                            Order #{tx.commerceOrderId}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        tx.type === 'top_up_credit'
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}
                    >
                      {formatTransactionAmount(tx.type, tx.amountInr)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Bal ₹{tx.balanceAfterInr}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
