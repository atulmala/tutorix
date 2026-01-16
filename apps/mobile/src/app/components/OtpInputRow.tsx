import React, { useMemo, useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

type OtpInputRowProps = {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  error?: string;
  length?: number;
};

export const OtpInputRow: React.FC<OtpInputRowProps> = ({
  value,
  onChange,
  disabled = false,
  error,
  length = 6,
}) => {
  const inputsRef = useRef<Array<TextInput | null>>([]);

  const digits = useMemo(() => {
    const clean = value.replace(/\D/g, '').slice(0, length);
    return Array.from({ length }, (_, idx) => clean[idx] ?? '');
  }, [value, length]);

  const updateValue = (nextDigits: string[]) => {
    const nextValue = nextDigits.join('').replace(/\s/g, '');
    onChange(nextValue);
  };

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    updateValue(nextDigits);
    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={`otp-${index}`}
          ref={(ref) => {
            inputsRef.current[index] = ref;
          }}
          style={[styles.input, error && styles.inputError]}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
          keyboardType="number-pad"
          maxLength={1}
          editable={!disabled}
          textAlign="center"
          placeholder="•"
          placeholderTextColor="#cbd5e1"
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#f87171',
    backgroundColor: '#fef2f2',
  },
});
