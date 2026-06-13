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
import type { ParentFormValues } from '@tutorix/student-detail-ui';

type ParentModalProps = {
  visible: boolean;
  initialValues?: {
    parentRelation?: string | null;
    parentName?: string | null;
  } | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ParentFormValues) => void;
};

export function ParentModal({
  visible,
  initialValues,
  saving = false,
  error,
  onClose,
  onSubmit,
}: ParentModalProps) {
  const [parentRelation, setParentRelation] = useState<'FATHER' | 'MOTHER'>('FATHER');
  const [parentName, setParentName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setParentRelation(initialValues?.parentRelation === 'MOTHER' ? 'MOTHER' : 'FATHER');
    setParentName(initialValues?.parentName?.trim() ?? '');
    setValidationError(null);
  }, [visible, initialValues]);

  const handleSubmit = () => {
    const name = parentName.trim();
    if (!name) {
      setValidationError('Parent name is required');
      return;
    }
    setValidationError(null);
    onSubmit({ parentRelation, parentName: name });
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
            <Text style={styles.title}>Parent / guardian</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>
              Please provide details for one parent or guardian.
            </Text>

            <Text style={styles.label}>
              Relationship <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.radioRow}>
              {(['FATHER', 'MOTHER'] as const).map((value) => (
                <TouchableOpacity
                  key={value}
                  style={styles.radioOption}
                  onPress={() => setParentRelation(value)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      parentRelation === value && styles.radioOuterSelected,
                    ]}
                  >
                    {parentRelation === value && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel}>
                    {value === 'FATHER' ? 'Father' : 'Mother'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>
              Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={parentName}
              onChangeText={setParentName}
              placeholder="Enter parent or guardian name"
              placeholderTextColor="#9ca3af"
              editable={!saving}
            />

            {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={saving}
                activeOpacity={0.7}
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
  hint: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
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
  radioRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#5fa8ff',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#5fa8ff',
  },
  radioLabel: {
    fontSize: 14,
    color: '#143055',
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
