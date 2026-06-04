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
} from 'react-native';
import {
  EDUCATIONAL_QUALIFICATION_LABELS,
  EducationalQualification,
  GRADE_TYPE_LABELS,
  GRADE_TYPE_LIST,
  GradeType,
  getQualificationDegreeLabel,
  getQualificationDegreePlaceholder,
  getQualificationFieldOfStudyPlaceholder,
  getQualificationGradeValuePlaceholder,
  validateQualificationRow,
  type QualificationFormRow,
  type QualificationRowFieldErrors,
} from '@tutorix/shared-utils';

export type { QualificationFormRow };

type QualificationModalProps = {
  visible: boolean;
  mode: 'edit' | 'add';
  initialRow: QualificationFormRow;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (row: QualificationFormRow) => void;
};

export function QualificationModal({
  visible,
  mode,
  initialRow,
  saving = false,
  error,
  onClose,
  onSubmit,
}: QualificationModalProps) {
  const [row, setRow] = useState<QualificationFormRow>(initialRow);
  const [fieldErrors, setFieldErrors] = useState<QualificationRowFieldErrors>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [gradeTypePickerVisible, setGradeTypePickerVisible] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!visible) {
      return;
    }
    setRow({ ...initialRow });
    setFieldErrors({});
    setValidationError(null);
    setGradeTypePickerVisible(false);
  }, [visible, initialRow]);

  const isHigherSecondary =
    row.qualificationType === EducationalQualification.HIGHER_SECONDARY;
  const displayError = validationError ?? error;

  const updateRow = (updates: Partial<QualificationFormRow>) => {
    setRow((prev) => ({ ...prev, ...updates }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      (Object.keys(updates) as (keyof QualificationFormRow)[]).forEach((k) => delete next[k]);
      return next;
    });
  };

  const handleSubmit = () => {
    const result = validateQualificationRow(row);
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
              {mode === 'edit' ? 'Edit qualification' : 'Add qualification'}
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
            <Text style={styles.label}>Qualification type</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>
                {EDUCATIONAL_QUALIFICATION_LABELS[row.qualificationType]}
              </Text>
            </View>

            <Text style={styles.label}>
              {getQualificationDegreeLabel(row.qualificationType)}
              {!isHigherSecondary ? <Text style={styles.required}> *</Text> : null}
            </Text>
            <TextInput
              style={[
                styles.input,
                !isHigherSecondary && fieldErrors.degreeName ? styles.inputError : null,
                isHigherSecondary ? styles.inputDisabled : null,
              ]}
              value={row.degreeName}
              onChangeText={(v) => updateRow({ degreeName: v })}
              placeholder={getQualificationDegreePlaceholder(row.qualificationType)}
              placeholderTextColor="#9ca3af"
              editable={!saving && !isHigherSecondary}
            />
            {!isHigherSecondary && fieldErrors.degreeName ? (
              <Text style={styles.fieldError}>{fieldErrors.degreeName}</Text>
            ) : null}

            <Text style={styles.label}>
              Specialization <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, fieldErrors.fieldOfStudy ? styles.inputError : null]}
              value={row.fieldOfStudy}
              onChangeText={(v) => updateRow({ fieldOfStudy: v })}
              placeholder={getQualificationFieldOfStudyPlaceholder(row.qualificationType)}
              placeholderTextColor="#9ca3af"
              editable={!saving}
            />
            {fieldErrors.fieldOfStudy ? (
              <Text style={styles.fieldError}>{fieldErrors.fieldOfStudy}</Text>
            ) : null}

            <Text style={styles.label}>
              Board / University <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, fieldErrors.boardOrUniversity ? styles.inputError : null]}
              value={row.boardOrUniversity}
              onChangeText={(v) => updateRow({ boardOrUniversity: v })}
              placeholder="e.g. CBSE, University of Delhi"
              placeholderTextColor="#9ca3af"
              editable={!saving}
            />
            {fieldErrors.boardOrUniversity ? (
              <Text style={styles.fieldError}>{fieldErrors.boardOrUniversity}</Text>
            ) : null}

            <Text style={styles.label}>
              Year obtained <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, fieldErrors.yearObtained ? styles.inputError : null]}
              value={row.yearObtained}
              onChangeText={(v) => updateRow({ yearObtained: v.replace(/\D/g, '') })}
              placeholder={String(currentYear)}
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              maxLength={4}
              editable={!saving}
            />
            {fieldErrors.yearObtained ? (
              <Text style={styles.fieldError}>{fieldErrors.yearObtained}</Text>
            ) : null}

            <Text style={styles.label}>
              Grade type <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setGradeTypePickerVisible(true)}
              disabled={saving}
            >
              <Text style={styles.selectButtonText}>{GRADE_TYPE_LABELS[row.gradeType]}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>
              Grade value <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, fieldErrors.gradeValue ? styles.inputError : null]}
              value={row.gradeValue}
              onChangeText={(v) => updateRow({ gradeValue: v })}
              placeholder={getQualificationGradeValuePlaceholder(row.gradeType)}
              placeholderTextColor="#9ca3af"
              editable={!saving}
            />
            {fieldErrors.gradeValue ? (
              <Text style={styles.fieldError}>{fieldErrors.gradeValue}</Text>
            ) : null}

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
        visible={gradeTypePickerVisible}
        animationType="fade"
        onRequestClose={() => setGradeTypePickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Grade type</Text>
            <ScrollView style={styles.pickerScroll}>
              {GRADE_TYPE_LIST.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={styles.pickerOption}
                  onPress={() => {
                    updateRow({ gradeType: t as GradeType });
                    setGradeTypePickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{GRADE_TYPE_LABELS[t]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerCancel}
              onPress={() => setGradeTypePickerVisible(false)}
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
  readOnlyField: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  readOnlyText: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
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
  inputError: { borderColor: '#dc2626' },
  inputDisabled: { opacity: 0.6, backgroundColor: '#f1f5f9' },
  fieldError: { fontSize: 12, color: '#dc2626', marginTop: 4 },
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
