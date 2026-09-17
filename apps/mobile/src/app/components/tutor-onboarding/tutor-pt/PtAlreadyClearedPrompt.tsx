import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { PT_ALREADY_CLEARED_MESSAGE } from '@tutorix/shared-utils/pt-overlap';

type PtAlreadyClearedPromptProps = {
  onAcknowledge: () => void;
  acknowledging?: boolean;
  error?: string | null;
};

export const PtAlreadyClearedPrompt: React.FC<PtAlreadyClearedPromptProps> = ({
  onAcknowledge,
  acknowledging = false,
  error,
}) => {
  return (
    <View style={styles.block}>
      <Text style={styles.message}>{PT_ALREADY_CLEARED_MESSAGE}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.button, acknowledging && styles.buttonDisabled]}
        onPress={onAcknowledge}
        disabled={acknowledging}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="OK"
      >
        <Text style={styles.buttonText}>{acknowledging ? 'Please wait…' : 'OK'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: 16 },
  message: { fontSize: 14, color: '#0f172a' },
  error: { fontSize: 14, color: '#dc2626' },
  button: {
    alignSelf: 'flex-end',
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#5fa8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
