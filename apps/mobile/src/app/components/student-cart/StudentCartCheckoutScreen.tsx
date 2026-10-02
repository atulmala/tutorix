import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import {
  MY_CART,
  MY_CLASS_CREDITS,
  PREPARE_CART_CHECKOUT,
  PREPARE_WALLET_PURCHASE,
} from '@tutorix/shared-graphql/queries';
import {
  COMPLETE_WALLET_PURCHASE,
  CONFIRM_WALLET_TOP_UP,
  INITIATE_WALLET_TOP_UP,
} from '@tutorix/shared-graphql/mutations';
import { formatInr } from '@tutorix/shared-utils/rate-card';
import {
  runWalletAwarePurchaseCheckout,
  type WalletPurchaseIntent,
  type WalletPurchasePreview,
} from '@tutorix/shared-utils/wallet-checkout';
import { openMobilePaymentCheckout } from '../../../lib/mobile-payment-checkout';

type CheckoutItem = {
  id: number;
  tutorName: string;
  offeringLabel: string;
  deliveryMode: 'online' | 'offline';
  quantity: number;
  lineTotalInr: number;
};

type StudentCartCheckoutScreenProps = {
  onScheduleNow: () => void;
};

export const StudentCartCheckoutScreen: React.FC<StudentCartCheckoutScreenProps> = ({
  onScheduleNow,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [paying, setPaying] = useState(false);
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
        openMobilePaymentCheckout,
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
    return <Text style={styles.hint}>Preparing checkout…</Text>;
  }
  if (error || !preview) {
    return <Text style={styles.hint}>Could not prepare checkout.</Text>;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Checkout</Text>
      <View style={styles.card}>
        {items.map((item) => (
          <View key={item.id} style={styles.line}>
            <Text style={styles.lineTitle}>{item.offeringLabel}</Text>
            <Text style={styles.meta}>
              {item.tutorName} · {item.deliveryMode === 'online' ? 'Online' : 'Offline'} ·{' '}
              {item.quantity} {item.quantity === 1 ? 'class' : 'classes'}
            </Text>
            <Text style={styles.lineTitle}>{formatInr(item.lineTotalInr)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.meta}>Wallet {formatInr(preview.walletBalanceInr)}</Text>
        <Text style={styles.lineTitle}>Total {formatInr(preview.purchaseAmountInr)}</Text>
        {!preview.canPayFromWallet ? (
          <Text style={styles.meta}>
            Razorpay will add {formatInr(preview.shortfallInr)} to your wallet, then the full
            amount is paid from the wallet.
          </Text>
        ) : null}
      </View>
      {errorMessage ? (
        <Text style={styles.error} accessibilityRole="alert">
          {errorMessage}
        </Text>
      ) : null}
      <Pressable
        style={[styles.primary, paying ? styles.primaryDisabled : null]}
        onPress={() => void pay()}
        disabled={paying}
        accessibilityRole="button"
        accessibilityState={{ disabled: paying, busy: paying }}
        accessibilityLabel={
          paying
            ? 'Processing payment'
            : paymentFailed
              ? 'Retry payment'
              : `Pay ${formatInr(preview.purchaseAmountInr)}`
        }
      >
        {paying ? (
          <ActivityIndicator color="#475569" />
        ) : (
          <Text style={styles.primaryText}>
            {paymentFailed ? 'Retry payment' : `Pay ${formatInr(preview.purchaseAmountInr)}`}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', color: '#143055' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 10 },
  line: { gap: 4 },
  lineTitle: { fontSize: 14, fontWeight: '800', color: '#143055' },
  meta: { color: '#64748b', fontSize: 13 },
  error: { color: '#dc2626', fontSize: 13 },
  primary: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryDisabled: { backgroundColor: '#cbd5e1' },
  primaryText: { color: '#fff', fontWeight: '700' },
  hint: { padding: 24, color: '#6b7280', textAlign: 'center' },
});
