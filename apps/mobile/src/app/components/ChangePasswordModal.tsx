import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ChangePasswordModalProps = {
  visible: boolean;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: { currentPassword: string; newPassword: string }) => void;
};

function validate(values: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): string | null {
  if (!values.currentPassword) {
    return 'Current password is required';
  }
  if (!values.newPassword) {
    return 'New password is required';
  }
  if (values.newPassword.length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (values.newPassword !== values.confirmPassword) {
    return 'Passwords do not match';
  }
  if (values.currentPassword === values.newPassword) {
    return 'New password must be different from the current password';
  }
  return null;
}

export function ChangePasswordModal({
  visible,
  saving = false,
  error,
  onClose,
  onSubmit,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setValidationError(null);
  }, [visible]);

  const handleSubmit = () => {
    const nextError = validate({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (nextError) {
      setValidationError(nextError);
      return;
    }
    setValidationError(null);
    onSubmit({ currentPassword, newPassword });
  };

  const displayError = validationError ?? error;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Change password</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>
              Current password <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={(value) => {
                setCurrentPassword(value);
                setValidationError(null);
              }}
              placeholder="Enter current password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
              accessibilityLabel="Current password"
            />

            <Text style={styles.label}>
              New password <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                setValidationError(null);
              }}
              placeholder="At least 6 characters"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
              accessibilityLabel="New password"
            />

            <Text style={styles.label}>
              Confirm new password <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setValidationError(null);
              }}
              placeholder="Re-enter new password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
              accessibilityLabel="Confirm new password"
            />

            {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Save password"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#143055',
  },
  close: {
    fontSize: 20,
    color: '#6b7280',
    padding: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#143055',
    marginBottom: 8,
    marginTop: 8,
  },
  required: {
    color: '#dc2626',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#143055',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    marginBottom: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#143055',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
