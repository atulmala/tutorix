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
  WALLET_STANDALONE_TOP_UP_MAX_INR,
  WALLET_STANDALONE_TOP_UP_MIN_INR,
  WALLET_STANDALONE_TOP_UP_PRESETS_INR,
} from '@tutorix/shared-utils';
import { WalletTopUpAmountField } from './WalletTopUpAmountField';

type WalletTopUpModalProps = {
  visible: boolean;
  topUpAmount: number;
  loading?: boolean;
  error?: string | null;
  onTopUpAmountChange: (amount: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export const WalletTopUpModal: React.FC<WalletTopUpModalProps> = ({
  visible,
  topUpAmount,
  loading = false,
  error,
  onTopUpAmountChange,
  onConfirm,
  onCancel,
}) => {
  const canConfirm =
    topUpAmount >= WALLET_STANDALONE_TOP_UP_MIN_INR &&
    topUpAmount <= WALLET_STANDALONE_TOP_UP_MAX_INR &&
    !loading;

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
            <Text style={styles.title}>Top up wallet</Text>
            <TouchableOpacity
              onPress={onCancel}
              disabled={loading}
              accessibilityLabel="Close"
            >
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.body}>
            Add money to your wallet for future payments. Minimum ₹
            {WALLET_STANDALONE_TOP_UP_MIN_INR}, maximum ₹
            {WALLET_STANDALONE_TOP_UP_MAX_INR.toLocaleString('en-IN')}.
          </Text>

          <View style={styles.presets}>
            {WALLET_STANDALONE_TOP_UP_PRESETS_INR.map((preset) => {
              const selected = topUpAmount === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[styles.presetChip, selected && styles.presetChipSelected]}
                  onPress={() => onTopUpAmountChange(preset)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetText,
                      selected && styles.presetTextSelected,
                    ]}
                  >
                    ₹{preset.toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <WalletTopUpAmountField
            value={topUpAmount}
            minAmount={WALLET_STANDALONE_TOP_UP_MIN_INR}
            maxAmount={WALLET_STANDALONE_TOP_UP_MAX_INR}
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
                <Text style={styles.confirmText}>
                  Pay ₹{topUpAmount.toLocaleString('en-IN')}
                </Text>
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
    gap: 16,
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
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  presetChipSelected: {
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  presetTextSelected: {
    color: '#0c4a6e',
  },
  error: {
    fontSize: 14,
    color: '#dc2626',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
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
