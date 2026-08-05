import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  formatWalletLowBalanceMessage,
  type WalletPurchasePreview,
} from '@tutorix/shared-utils';
import { WalletTopUpAmountField } from './WalletTopUpAmountField';

type WalletLowBalanceModalProps = {
  visible: boolean;
  preview: WalletPurchasePreview | null;
  topUpAmount: number;
  loading?: boolean;
  error?: string | null;
  onTopUpAmountChange: (amount: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export const WalletLowBalanceModal: React.FC<WalletLowBalanceModalProps> = ({
  visible,
  preview,
  topUpAmount,
  loading = false,
  error,
  onTopUpAmountChange,
  onConfirm,
  onCancel,
}) => {
  if (!preview) {
    return null;
  }

  const canConfirm = topUpAmount >= preview.shortfallInr && !loading;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!loading) onCancel();
      }}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Wallet balance low</Text>
            <TouchableOpacity
              onPress={onCancel}
              disabled={loading}
              accessibilityLabel="Close"
            >
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.body}>
            {formatWalletLowBalanceMessage(
              preview.walletBalanceInr,
              preview.shortfallInr,
            )}
          </Text>
          <Text style={styles.body}>{preview.purchaseDescription}</Text>

          <WalletTopUpAmountField
            value={topUpAmount}
            minAmount={preview.shortfallInr}
            onChange={onTopUpAmountChange}
            disabled={loading}
          />

          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, !canConfirm && styles.confirmDisabled]}
              onPress={onConfirm}
              disabled={!canConfirm}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmText}>Pay ₹{topUpAmount}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  close: {
    fontSize: 18,
    color: '#64748b',
    padding: 4,
  },
  body: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  error: {
    fontSize: 14,
    color: '#dc2626',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  confirmButton: {
    borderRadius: 8,
    backgroundColor: '#5fa8ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
