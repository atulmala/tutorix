import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMutation } from '@apollo/client';
import { GET_MY_STUDENT_PROFILE } from '@tutorix/shared-graphql/queries';
import { SAVE_STUDENT_EDUCATION } from '@tutorix/shared-graphql/mutations';
import {
  SCHOOL_BOARD_OPTIONS,
  SCHOOL_CLASS_OPTIONS,
  STUDENT_TYPE_OPTIONS,
} from '@tutorix/shared-utils';
import type { StudentStepComponentProps } from './types';

type StudentType = 'SCHOOL' | 'COLLEGE' | 'NOT_STUDYING' | 'COMPLETED';
type Board = 'CBSE' | 'ICSE' | 'IB' | 'OTHER';

type PickerModal = 'class' | 'board' | null;

export const StudentEducationStep: React.FC<StudentStepComponentProps> = ({
  onComplete,
}) => {
  const [studentType, setStudentType] = useState<StudentType>('SCHOOL');
  const [schoolClass, setSchoolClass] = useState<number | ''>('');
  const [board, setBoard] = useState<Board | ''>('');
  const [boardOther, setBoardOther] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pickerModal, setPickerModal] = useState<PickerModal>(null);

  const [saveEducation, { loading }] = useMutation(SAVE_STUDENT_EDUCATION, {
    refetchQueries: [{ query: GET_MY_STUDENT_PROFILE }],
    awaitRefetchQueries: true,
    onCompleted: () => onComplete(),
    onError: (err) => {
      setError(
        err.graphQLErrors?.[0]?.message ||
          err.message ||
          'Failed to save. Please try again.',
      );
    },
  });

  const classLabel =
    schoolClass !== ''
      ? SCHOOL_CLASS_OPTIONS.find((o) => o.value === schoolClass)?.label ?? ''
      : '';
  const boardLabel =
    board !== ''
      ? SCHOOL_BOARD_OPTIONS.find((o) => o.value === board)?.label ?? ''
      : '';

  const handleSubmit = async () => {
    setError(null);

    if (studentType === 'SCHOOL') {
      if (!schoolClass) {
        setError('Please select your class');
        return;
      }
      if (!board) {
        setError('Please select your board');
        return;
      }
      if (board === 'OTHER' && !boardOther.trim()) {
        setError('Please specify your board');
        return;
      }
    }

    await saveEducation({
      variables: {
        input: {
          studentType,
          schoolClass: studentType === 'SCHOOL' ? schoolClass : undefined,
          board: studentType === 'SCHOOL' ? board : undefined,
          boardOther:
            studentType === 'SCHOOL' && board === 'OTHER'
              ? boardOther.trim()
              : undefined,
        },
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
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
                  editable={!loading}
                />
              </>
            )}
          </>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.continueButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.continueButtonText}>Complete onboarding</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={pickerModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerModal(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {pickerModal === 'class' ? 'Select class' : 'Select board'}
            </Text>
            <ScrollView>
              {pickerModal === 'class' &&
                SCHOOL_CLASS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.modalOption}
                    onPress={() => {
                      setSchoolClass(opt.value);
                      setPickerModal(null);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              {pickerModal === 'board' &&
                SCHOOL_BOARD_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.modalOption}
                    onPress={() => {
                      setBoard(opt.value as Board);
                      setPickerModal(null);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
    padding: 24,
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
    marginBottom: 20,
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
    marginBottom: 16,
  },
  half: {
    flex: 1,
  },
  pickerButton: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#143055',
  },
  pickerPlaceholder: {
    color: '#9ca3af',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#143055',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  continueButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#5fa8ff',
    borderRadius: 8,
    minWidth: 160,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(95, 168, 255, 0.4)',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '50%',
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#143055',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#143055',
  },
});
