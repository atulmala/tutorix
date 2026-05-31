import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  INDIAN_BANKS,
  OTHER_BANK_OPTION,
  validateBankDetailsForm,
} from '@tutorix/shared-utils';
import type { BankDetailsFormValues } from '@tutorix/tutor-detail-ui';

type BankDetailsModalProps = {
  visible: boolean;
  initialValues?: {
    bankName?: string | null;
    ifscCode?: string | null;
    panNumber?: string | null;
    gstNumber?: string | null;
  } | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: BankDetailsFormValues) => void;
};

function resolveBankSelectValue(bankName?: string | null): string {
  if (!bankName) {
    return '';
  }
  if ((INDIAN_BANKS as readonly string[]).includes(bankName)) {
    return bankName;
  }
  return OTHER_BANK_OPTION;
}

export function BankDetailsModal({
  visible,
  initialValues,
  saving = false,
  error,
  onClose,
  onSubmit,
}: BankDetailsModalProps) {
  const [bankSelect, setBankSelect] = useState('');
  const [customBankName, setCustomBankName] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const selectValue = resolveBankSelectValue(initialValues?.bankName);
    setBankSelect(selectValue);
    setCustomBankName(
      selectValue === OTHER_BANK_OPTION ? initialValues?.bankName?.trim() ?? '' : '',
    );
    setAccountNumber('');
    setIfscCode(initialValues?.ifscCode?.trim().toUpperCase() ?? '');
    setPanNumber(initialValues?.panNumber?.trim().toUpperCase() ?? '');
    setGstNumber(initialValues?.gstNumber?.trim() ?? '');
    setValidationError(null);
    setShowBankPicker(false);
  }, [visible, initialValues]);

  const resolvedBankName = useMemo(() => {
    if (bankSelect === OTHER_BANK_OPTION) {
      return customBankName.trim();
    }
    return bankSelect.trim();
  }, [bankSelect, customBankName]);

  const bankSelectLabel = bankSelect
    ? bankSelect === OTHER_BANK_OPTION
      ? OTHER_BANK_OPTION
      : bankSelect
    : 'Select a bank';

  const handleSubmit = () => {
    const result = validateBankDetailsForm({
      bankName: resolvedBankName,
      accountNumber,
      ifscCode,
      panNumber,
      gstNumber,
    });
    if (result.ok === false) {
      setValidationError(result.message);
      return;
    }
    setValidationError(null);
    onSubmit(result.normalized);
  };

  const displayError = validationError ?? error;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Bank details</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close" disabled={saving}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Bank name</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowBankPicker(true)}
              disabled={saving}
            >
              <Text style={[styles.selectButtonText, !bankSelect && styles.selectPlaceholder]}>
                {bankSelectLabel}
              </Text>
            </TouchableOpacity>

            {bankSelect === OTHER_BANK_OPTION ? (
              <>
                <Text style={styles.label}>Enter bank name</Text>
                <TextInput
                  style={styles.input}
                  value={customBankName}
                  onChangeText={setCustomBankName}
                  placeholder="Your bank name"
                  placeholderTextColor="#9ca3af"
                  editable={!saving}
                />
              </>
            ) : null}

            <Text style={styles.label}>Account number</Text>
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={(t) => setAccountNumber(t.replace(/\D/g, ''))}
              placeholder={
                initialValues?.bankName ? 'Re-enter to update' : 'Enter account number'
              }
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              editable={!saving}
            />

            <Text style={styles.label}>IFSC code</Text>
            <TextInput
              style={styles.input}
              value={ifscCode}
              onChangeText={(t) => setIfscCode(t.toUpperCase())}
              placeholder="HDFC0001234"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              maxLength={11}
              editable={!saving}
            />

            <Text style={styles.label}>PAN</Text>
            <TextInput
              style={styles.input}
              value={panNumber}
              onChangeText={(t) => setPanNumber(t.toUpperCase())}
              placeholder="ABCDE1234F"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              maxLength={10}
              editable={!saving}
            />

            <Text style={styles.label}>GST number (optional)</Text>
            <TextInput
              style={styles.input}
              value={gstNumber}
              onChangeText={(t) => setGstNumber(t.toUpperCase())}
              placeholder="Leave blank if not applicable"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              maxLength={15}
              editable={!saving}
            />

            {displayError ? (
              <Text style={styles.error} accessibilityRole="alert">
                {displayError}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (!bankSelect || saving) && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={!bankSelect || saving}
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

      <Modal transparent visible={showBankPicker} animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Select bank</Text>
            <ScrollView style={styles.pickerScroll}>
              {INDIAN_BANKS.map((bank) => (
                <TouchableOpacity
                  key={bank}
                  style={styles.pickerOption}
                  onPress={() => {
                    setBankSelect(bank);
                    setShowBankPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{bank}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => {
                  setBankSelect(OTHER_BANK_OPTION);
                  setShowBankPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{OTHER_BANK_OPTION}</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerCancel}
              onPress={() => setShowBankPicker(false)}
            >
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

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
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a', flex: 1 },
  close: { fontSize: 22, color: '#64748b', paddingLeft: 12 },
  scroll: { maxHeight: '100%' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 28 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 6,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  selectButtonText: { fontSize: 16, color: '#0f172a' },
  selectPlaceholder: { color: '#9ca3af' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  error: { fontSize: 14, color: '#b91c1c', marginTop: 12 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  saveButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 88,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  pickerScroll: { maxHeight: 320 },
  pickerOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerOptionText: { fontSize: 16, color: '#0f172a' },
  pickerCancel: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  pickerCancelText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
});
