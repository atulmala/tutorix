import React, { useEffect, useState } from 'react';
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
  Switch,
} from 'react-native';
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPE_LIST,
  EmploymentType,
  validateExperienceRow,
  type ExperienceFormRow,
  type ExperienceRowFieldErrors,
} from '@tutorix/shared-utils';

type ExperienceModalProps = {
  visible: boolean;
  mode: 'edit' | 'add';
  initialRow: ExperienceFormRow;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (row: ExperienceFormRow) => void;
};

function formatDateInput(value: string): string {
  let formatted = value.replace(/\D/g, '');
  if (formatted.length > 4) {
    formatted = `${formatted.slice(0, 4)}-${formatted.slice(4)}`;
  }
  if (formatted.length > 7) {
    formatted = `${formatted.slice(0, 7)}-${formatted.slice(7, 9)}`;
  }
  return formatted;
}

export function ExperienceModal({
  visible,
  mode,
  initialRow,
  saving = false,
  error,
  onClose,
  onSubmit,
}: ExperienceModalProps) {
  const [row, setRow] = useState<ExperienceFormRow>(initialRow);
  const [fieldErrors, setFieldErrors] = useState<ExperienceRowFieldErrors>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [employmentTypePickerVisible, setEmploymentTypePickerVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setRow({ ...initialRow });
    setFieldErrors({});
    setValidationError(null);
    setEmploymentTypePickerVisible(false);
  }, [visible, initialRow]);

  const isSelfEmployed = row.employmentType === EmploymentType.SELF_EMPLOYED;
  const displayError = validationError ?? error;

  const updateRow = (updates: Partial<ExperienceFormRow>) => {
    setRow((prev) => ({ ...prev, ...updates }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      (Object.keys(updates) as (keyof ExperienceFormRow)[]).forEach((k) => delete next[k]);
      return next;
    });
  };

  const handleSubmit = () => {
    const result = validateExperienceRow(row);
    if (result.ok === false) {
      setFieldErrors(result.fieldErrors);
      setValidationError(null);
      return;
    }
    setValidationError(null);
    onSubmit(result.normalized);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'edit' ? 'Edit experience' : 'Add new experience'}
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close" disabled={saving}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>
              Employment type <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setEmploymentTypePickerVisible(true)}
              disabled={saving}
            >
              <Text style={styles.selectButtonText}>
                {EMPLOYMENT_TYPE_LABELS[row.employmentType]}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>
              Job title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, fieldErrors.jobTitle ? styles.inputError : null]}
              value={row.jobTitle}
              onChangeText={(v) => updateRow({ jobTitle: v })}
              placeholder="e.g. Mathematics Teacher"
              placeholderTextColor="#9ca3af"
              editable={!saving}
            />
            {fieldErrors.jobTitle ? (
              <Text style={styles.fieldError}>{fieldErrors.jobTitle}</Text>
            ) : null}

            {!isSelfEmployed ? (
              <>
                <Text style={styles.label}>
                  Employer name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, fieldErrors.employerName ? styles.inputError : null]}
                  value={row.employerName}
                  onChangeText={(v) => updateRow({ employerName: v })}
                  placeholder="e.g. ABC School"
                  placeholderTextColor="#9ca3af"
                  editable={!saving}
                />
                {fieldErrors.employerName ? (
                  <Text style={styles.fieldError}>{fieldErrors.employerName}</Text>
                ) : null}

                <Text style={styles.label}>
                  Employer address <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    fieldErrors.employerAddress ? styles.inputError : null,
                  ]}
                  value={row.employerAddress}
                  onChangeText={(v) => updateRow({ employerAddress: v })}
                  placeholder="Full address of the employer"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  editable={!saving}
                />
                {fieldErrors.employerAddress ? (
                  <Text style={styles.fieldError}>{fieldErrors.employerAddress}</Text>
                ) : null}
              </>
            ) : null}

            <View style={styles.rowTwoCols}>
              <View style={styles.col}>
                <Text style={styles.label}>
                  Start date <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, fieldErrors.startDate ? styles.inputError : null]}
                  value={row.startDate}
                  onChangeText={(v) => updateRow({ startDate: formatDateInput(v) })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                  editable={!saving}
                />
                {fieldErrors.startDate ? (
                  <Text style={styles.fieldError}>{fieldErrors.startDate}</Text>
                ) : null}
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>
                  End date
                  {!row.isCurrent ? <Text style={styles.required}> *</Text> : null}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors.endDate ? styles.inputError : null,
                    row.isCurrent ? styles.inputDisabled : null,
                  ]}
                  value={row.endDate}
                  onChangeText={(v) => updateRow({ endDate: formatDateInput(v) })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                  editable={!saving && !row.isCurrent}
                />
                {fieldErrors.endDate ? (
                  <Text style={styles.fieldError}>{fieldErrors.endDate}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Currently working here</Text>
              <Switch
                value={row.isCurrent}
                onValueChange={(v) => updateRow({ isCurrent: v })}
                trackColor={{ false: '#e2e8f0', true: '#5fa8ff' }}
                thumbColor="#fff"
                disabled={saving}
              />
            </View>

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
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={saving}
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

      <Modal
        transparent
        visible={employmentTypePickerVisible}
        animationType="fade"
        onRequestClose={() => setEmploymentTypePickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Employment type</Text>
            <ScrollView style={styles.pickerScroll}>
              {EMPLOYMENT_TYPE_LIST.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={styles.pickerOption}
                  onPress={() => {
                    updateRow({ employmentType: t });
                    setEmploymentTypePickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{EMPLOYMENT_TYPE_LABELS[t]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerCancel}
              onPress={() => setEmploymentTypePickerVisible(false)}
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
  required: { color: '#dc2626' },
  selectButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  selectButtonText: { fontSize: 16, color: '#0f172a' },
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
  textArea: {
    minHeight: 80,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: '#dc2626' },
  inputDisabled: { opacity: 0.6, backgroundColor: '#f1f5f9' },
  fieldError: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  rowTwoCols: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, minWidth: 0 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
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
