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
import {
  SCHOOL_BOARD_OPTIONS,
  SCHOOL_CLASS_OPTIONS,
  STUDENT_TYPE_OPTIONS,
} from '@tutorix/shared-utils';
import type { EducationFormValues, StudentDetailRecord } from '@tutorix/student-detail-ui';

type StudentType = EducationFormValues['studentType'];
type Board = NonNullable<EducationFormValues['board']>;
type PickerModal = 'class' | 'board' | null;

type EducationModalProps = {
  visible: boolean;
  initialValues?: StudentDetailRecord | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: EducationFormValues) => void;
};

export function EducationModal({
  visible,
  initialValues,
  saving = false,
  error,
  onClose,
  onSubmit,
}: EducationModalProps) {
  const [studentType, setStudentType] = useState<StudentType>('SCHOOL');
  const [schoolClass, setSchoolClass] = useState<number | ''>('');
  const [board, setBoard] = useState<Board | ''>('');
  const [boardOther, setBoardOther] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pickerModal, setPickerModal] = useState<PickerModal>(null);

  useEffect(() => {
    if (!visible) return;
    const type = (initialValues?.studentType as StudentType | undefined) ?? 'SCHOOL';
    setStudentType(type);
    setSchoolClass(initialValues?.schoolClass ?? '');
    setBoard((initialValues?.board as Board | undefined) ?? '');
    setBoardOther(initialValues?.boardOther?.trim() ?? '');
    setValidationError(null);
    setPickerModal(null);
  }, [visible, initialValues]);

  const classLabel =
    schoolClass !== ''
      ? SCHOOL_CLASS_OPTIONS.find((o) => o.value === schoolClass)?.label ?? ''
      : '';
  const boardLabel =
    board !== '' ? SCHOOL_BOARD_OPTIONS.find((o) => o.value === board)?.label ?? '' : '';

  const handleSubmit = () => {
    if (studentType === 'SCHOOL') {
      if (!schoolClass) {
        setValidationError('Please select your class');
        return;
      }
      if (!board) {
        setValidationError('Please select your board');
        return;
      }
      if (board === 'OTHER' && !boardOther.trim()) {
        setValidationError('Please specify your board');
        return;
      }
    }

    setValidationError(null);
    onSubmit({
      studentType,
      schoolClass:
        studentType === 'SCHOOL' && schoolClass !== '' ? schoolClass : undefined,
      board: studentType === 'SCHOOL' && board !== '' ? board : undefined,
      boardOther:
        studentType === 'SCHOOL' && board === 'OTHER' ? boardOther.trim() : undefined,
    });
  };

  const displayError = validationError ?? error;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.overlay}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Education</Text>
              <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>
                I am a <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.typeGrid}>
                {STUDENT_TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.typeOption,
                      studentType === opt.value && styles.typeOptionSelected,
                    ]}
                    onPress={() => setStudentType(opt.value as StudentType)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        studentType === opt.value && styles.radioOuterSelected,
                      ]}
                    >
                      {studentType === opt.value && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.typeLabel}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {studentType === 'SCHOOL' && (
                <>
                  <View style={styles.row}>
                    <View style={styles.half}>
                      <Text style={styles.label}>
                        Class <Text style={styles.required}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setPickerModal('class')}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.pickerButtonText,
                            !classLabel && styles.pickerPlaceholder,
                          ]}
                        >
                          {classLabel || 'Select class'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.half}>
                      <Text style={styles.label}>
                        Board <Text style={styles.required}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setPickerModal('board')}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.pickerButtonText,
                            !boardLabel && styles.pickerPlaceholder,
                          ]}
                        >
                          {boardLabel || 'Select board'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {board === 'OTHER' && (
                    <>
                      <Text style={styles.label}>
                        Board name <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={boardOther}
                        onChangeText={setBoardOther}
                        placeholder="Enter board name"
                        placeholderTextColor="#9ca3af"
                        editable={!saving}
                      />
                    </>
                  )}
                </>
              )}

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

      <Modal
        visible={pickerModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerModal(null)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerModal(null)}
        >
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>
              {pickerModal === 'class' ? 'Select class' : 'Select board'}
            </Text>
            <ScrollView>
              {pickerModal === 'class' &&
                SCHOOL_CLASS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.pickerOption}
                    onPress={() => {
                      setSchoolClass(opt.value);
                      setPickerModal(null);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              {pickerModal === 'board' &&
                SCHOOL_BOARD_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.pickerOption}
                    onPress={() => {
                      setBoard(opt.value as Board);
                      setPickerModal(null);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
  },
  required: {
    color: '#dc2626',
  },
  typeGrid: {
    gap: 8,
    marginBottom: 16,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typeOptionSelected: {
    borderColor: '#5fa8ff',
    backgroundColor: 'rgba(95, 168, 255, 0.05)',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
  typeLabel: {
    fontSize: 14,
    color: '#143055',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  half: {
    flex: 1,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#143055',
  },
  pickerPlaceholder: {
    color: '#9ca3af',
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
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '50%',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#143055',
    marginBottom: 12,
  },
  pickerOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#143055',
  },
});
