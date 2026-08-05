import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

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
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {maxAmount != null ? 'Or enter amount' : 'Amount to add'}
      </Text>
      <View style={styles.inputRow}>
        <Text style={styles.currency}>₹</Text>
        <TextInput
          style={styles.input}
          value={String(value)}
          onChangeText={(text) => {
            const next = Number.parseInt(text.replace(/\D/g, ''), 10);
            onChange(Number.isNaN(next) ? minAmount : next);
          }}
          keyboardType="number-pad"
          editable={!disabled}
          placeholderTextColor="#9ca3af"
          accessibilityLabel="Top-up amount"
        />
      </View>
      <Text style={styles.hint}>
        {maxAmount != null
          ? `Between ₹${minAmount.toLocaleString('en-IN')} and ₹${maxAmount.toLocaleString('en-IN')}.`
          : `Minimum ₹${minAmount}. You can add a higher amount.`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    minHeight: 44,
  },
  currency: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 10,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
  },
});
