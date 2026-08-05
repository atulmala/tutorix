import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import {
  MY_WALLET,
  MY_WALLET_TRANSACTIONS,
} from '@tutorix/shared-graphql/queries';
import {
  CONFIRM_WALLET_TOP_UP,
  INITIATE_WALLET_TOP_UP,
} from '@tutorix/shared-graphql/mutations';
import {
  runStandaloneWalletTopUp,
  WALLET_STANDALONE_TOP_UP_PRESETS_INR,
} from '@tutorix/shared-utils';
import { openMobilePaymentCheckout } from '../../../lib/mobile-payment-checkout';
import { WalletTopUpModal } from './WalletTopUpModal';

type WalletScreenProps = {
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

export const WalletScreen: React.FC<WalletScreenProps> = ({ onBack }) => {
  const [showTopUpModal, setShowTopUpModal] = useState(false);
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
    setShowTopUpModal(true);
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
          return (
            response.data?.confirmWalletTopUp ?? { wallet: { balanceInr: 0 } }
          );
        },
        openMobilePaymentCheckout,
      );
      setShowTopUpModal(false);
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
      <WalletTopUpModal
        visible={showTopUpModal}
        topUpAmount={topUpAmount}
        loading={topUpLoading}
        error={topUpError}
        onTopUpAmountChange={setTopUpAmount}
        onConfirm={() => void handleConfirmTopUp()}
        onCancel={() => {
          if (topUpLoading) return;
          setShowTopUpModal(false);
          setTopUpError(null);
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Wallet</Text>
            <Text style={styles.subtitle}>
              Your balance and transaction history
            </Text>
          </View>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Current balance</Text>
              <Text style={styles.balanceValue}>
                {walletLoading ? '…' : `₹${balance}`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.topUpButton}
              onPress={handleOpenTopUp}
              activeOpacity={0.7}
            >
              <Text style={styles.topUpButtonText}>Top up wallet</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.txSection}>
          <Text style={styles.txTitle}>Transactions</Text>
          {txLoading ? (
            <View style={styles.txLoading}>
              <ActivityIndicator color="#5fa8ff" />
              <Text style={styles.muted}>Loading transactions…</Text>
            </View>
          ) : transactions.length === 0 ? (
            <Text style={styles.muted}>No transactions yet.</Text>
          ) : (
            <View style={styles.txList}>
              {transactions.map((tx) => (
                <View key={tx.id} style={styles.txItem}>
                  <View style={styles.txLeft}>
                    <Text style={styles.txDescription}>{tx.description}</Text>
                    <Text style={styles.txMeta}>
                      {formatTransactionType(tx.type)} ·{' '}
                      {new Date(tx.createdDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        tx.type === 'top_up_credit'
                          ? styles.txCredit
                          : styles.txDebit,
                      ]}
                    >
                      {formatTransactionAmount(tx.type, tx.amountInr)}
                    </Text>
                    <Text style={styles.txMeta}>Bal ₹{tx.balanceAfterInr}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748b',
  },
  backButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  balanceCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    padding: 20,
  },
  balanceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0c4a6e',
  },
  balanceValue: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '700',
    color: '#082f49',
  },
  topUpButton: {
    borderRadius: 8,
    backgroundColor: '#5fa8ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topUpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  txSection: {
    gap: 12,
  },
  txTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  txLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  muted: {
    fontSize: 14,
    color: '#64748b',
  },
  txList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  txLeft: {
    flex: 1,
    minWidth: 0,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  txMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  txCredit: {
    color: '#15803d',
  },
  txDebit: {
    color: '#b91c1c',
  },
});
