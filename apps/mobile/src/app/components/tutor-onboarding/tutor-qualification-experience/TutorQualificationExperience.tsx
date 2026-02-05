import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { SAVE_TUTOR_QUALIFICATIONS } from '@tutorix/shared-graphql/mutations';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import {
  EducationalQualification,
  EDUCATIONAL_QUALIFICATION_LIST,
  EDUCATIONAL_QUALIFICATION_LABELS,
  GradeType,
  GRADE_TYPE_LIST,
  GRADE_TYPE_LABELS,
} from '@tutorix/shared-utils';
import type { StepComponentProps } from '@tutorix/shared-utils';

interface QualificationRow {
  qualificationType: EducationalQualification;
  boardOrUniversity: string;
  gradeType: GradeType;
  gradeValue: string;
  yearObtained: string;
  fieldOfStudy: string;
}

const currentYear = new Date().getFullYear();

type SubStep = 'education' | 'experience';

export const TutorQualificationExperience: React.FC<StepComponentProps> = ({
  onComplete,
  onBack,
}) => {
  const [subStep, setSubStep] = useState<SubStep>('education');
  const [qualifications, setQualifications] = useState<QualificationRow[]>(() => [
    {
      qualificationType: EducationalQualification.HIGHER_SECONDARY,
      boardOrUniversity: '',
      gradeType: GradeType.PERCENTAGE,
      gradeValue: '',
      yearObtained: '',
      fieldOfStudy: '',
    },
  ]);
  const [errors, setErrors] = useState<
    Record<number, Partial<Record<keyof QualificationRow, string>>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [gradeTypeModal, setGradeTypeModal] = useState<{ rowIndex: number } | null>(null);

  const { data: profileData } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const list = profileData?.myTutorProfile?.qualifications;
    if (!list?.length) return;
    setQualifications(
      list.map(
        (q: {
          qualificationType: string;
          boardOrUniversity: string;
          gradeType: string;
          gradeValue: string;
          yearObtained: number;
          fieldOfStudy?: string | null;
        }) => ({
          qualificationType: q.qualificationType as EducationalQualification,
          boardOrUniversity: q.boardOrUniversity ?? '',
          gradeType: q.gradeType as GradeType,
          gradeValue: String(q.gradeValue ?? ''),
          yearObtained: q.yearObtained != null ? String(q.yearObtained) : '',
          fieldOfStudy: q.fieldOfStudy ?? '',
        })
      )
    );
    setSubStep('experience');
  }, [profileData?.myTutorProfile?.qualifications]);

  const [saveQualifications, { loading: isSubmitting }] = useMutation(
    SAVE_TUTOR_QUALIFICATIONS,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
      update: (cache, { data }) => {
        if (!data?.saveTutorQualifications) return;
        try {
          const existing = cache.readQuery<{
            myTutorProfile?: { id: number; certificationStage?: string };
          }>({ query: GET_MY_TUTOR_PROFILE });
          if (existing?.myTutorProfile) {
            cache.writeQuery({
              query: GET_MY_TUTOR_PROFILE,
              data: {
                myTutorProfile: {
                  ...existing.myTutorProfile,
                  certificationStage: 'qualificationExperience',
                },
              },
            });
          }
        } catch {
          /* ignore */
        }
      },
      onCompleted: () => setSubStep('experience'),
      onError: (error) => {
        setSubmitError(
          error.graphQLErrors?.[0]?.message ||
            error.message ||
            'Failed to save qualifications. Please try again.'
        );
      },
    }
  );

  const updateRow = useCallback((index: number, updates: Partial<QualificationRow>) => {
    setQualifications((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    );
    setErrors((prev) => {
      const next = { ...prev };
      const rowErrors = next[index];
      if (rowErrors) {
        const keys = Object.keys(updates) as (keyof QualificationRow)[];
        keys.forEach((k) => delete rowErrors[k]);
        if (Object.keys(rowErrors).length === 0) delete next[index];
      }
      return next;
    });
  }, []);

  const addQualification = useCallback((type: EducationalQualification) => {
    setQualifications((prev) => [
      ...prev,
      {
        qualificationType: type,
        boardOrUniversity: '',
        gradeType: GradeType.PERCENTAGE,
        gradeValue: '',
        yearObtained: '',
        fieldOfStudy: '',
      },
    ]);
  }, []);

  const removeQualification = useCallback((index: number) => {
    const row = qualifications[index];
    if (row?.qualificationType === EducationalQualification.HIGHER_SECONDARY) return;
    setQualifications((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, [qualifications]);

  const usedTypes = qualifications.map((q) => q.qualificationType);
  const availableToAdd = EDUCATIONAL_QUALIFICATION_LIST.filter(
    (t) =>
      t !== EducationalQualification.HIGHER_SECONDARY && !usedTypes.includes(t)
  );

  const validate = useCallback((): boolean => {
    setFormError(null);
    const next: Record<number, Partial<Record<keyof QualificationRow, string>>> = {};
    let valid = true;
    const hasHigherSecondary = qualifications.some(
      (q) => q.qualificationType === EducationalQualification.HIGHER_SECONDARY
    );
    if (!hasHigherSecondary) {
      setFormError('At least one qualification must be Higher Secondary.');
      valid = false;
    }
    qualifications.forEach((row, index) => {
      const e: Partial<Record<keyof QualificationRow, string>> = {};
      if (!row.boardOrUniversity.trim()) e.boardOrUniversity = 'Required';
      if (!row.gradeValue.trim()) e.gradeValue = 'Required';
      const year = parseInt(row.yearObtained, 10);
      if (!row.yearObtained.trim()) e.yearObtained = 'Required';
      else if (Number.isNaN(year) || year < 1950 || year > currentYear)
        e.yearObtained = `Enter a year between 1950 and ${currentYear}`;
      if (Object.keys(e).length) {
        next[index] = { ...next[index], ...e };
        valid = false;
      }
    });
    setErrors(next);
    return valid;
  }, [qualifications]);

  const handleSubmit = () => {
    setSubmitError(null);
    if (!validate()) return;

    const onlyHigherSecondary =
      qualifications.length === 1 &&
      qualifications[0].qualificationType === EducationalQualification.HIGHER_SECONDARY;
    if (onlyHigherSecondary) {
      Alert.alert(
        'Confirm',
        'Are you sure you want to go ahead without entering any additional qualifications?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: doSaveQualifications },
        ]
      );
      return;
    }
    doSaveQualifications();
  };

  const doSaveQualifications = () => {
    saveQualifications({
      variables: {
        input: {
          qualifications: qualifications.map((row, index) => ({
            qualificationType: row.qualificationType,
            boardOrUniversity: row.boardOrUniversity.trim(),
            gradeType: row.gradeType,
            gradeValue: row.gradeValue.trim(),
            yearObtained: parseInt(row.yearObtained, 10),
            fieldOfStudy: row.fieldOfStudy.trim() || undefined,
            displayOrder: index,
          })),
        },
      },
    });
  };

  if (subStep === 'experience') {
    return (
      <View style={styles.block}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Experience entry</Text>
          <Text style={styles.muted}>
            Teaching and work experience entry will be available here. You can continue to
            the next step for now.
          </Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setSubStep('education')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onComplete?.()}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Text style={styles.intro}>
        Add your educational qualifications. Higher Secondary is required. You can add
        more (e.g. Bachelors, Masters) below.
      </Text>
      <Text style={[styles.intro, styles.introItalic]}>
        Please be truthful. Later, you will be required to upload qualification documents
        for verification.
      </Text>

      {qualifications.map((row, index) => (
        <View key={`${row.qualificationType}-${index}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {EDUCATIONAL_QUALIFICATION_LABELS[row.qualificationType]}
              {row.qualificationType === EducationalQualification.HIGHER_SECONDARY && (
                <Text style={styles.requiredLabel}> (Required)</Text>
              )}
            </Text>
            {row.qualificationType !== EducationalQualification.HIGHER_SECONDARY && (
              <TouchableOpacity
                onPress={() => removeQualification(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Board / University <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, !!errors[index]?.boardOrUniversity && styles.inputError]}
              value={row.boardOrUniversity}
              onChangeText={(v) => updateRow(index, { boardOrUniversity: v })}
              placeholder="e.g. CBSE, University of Delhi"
              placeholderTextColor="#9ca3af"
            />
            {!!errors[index]?.boardOrUniversity && (
              <Text style={styles.fieldError}>{errors[index].boardOrUniversity}</Text>
            )}
          </View>

          <View style={styles.rowTwoCols}>
            <View style={styles.inputGroupFlex}>
              <Text style={styles.label}>
                Grade type <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
              style={styles.pickerTouch}
              onPress={() => setGradeTypeModal({ rowIndex: index })}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerText}>{GRADE_TYPE_LABELS[row.gradeType]}</Text>
                <Text style={styles.pickerChevron}>▼</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroupFlex}>
              <Text style={styles.label}>
                Grade value <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, !!errors[index]?.gradeValue && styles.inputError]}
                value={row.gradeValue}
                onChangeText={(v) => updateRow(index, { gradeValue: v })}
                placeholder={
                  row.gradeType === GradeType.CGPA
                    ? 'e.g. 8.5'
                    : row.gradeType === GradeType.PERCENTAGE
                      ? 'e.g. 85'
                      : 'e.g. First Division'
                }
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
              {!!errors[index]?.gradeValue && (
                <Text style={styles.fieldError}>{errors[index].gradeValue}</Text>
              )}
            </View>
          </View>

          <View style={styles.rowTwoCols}>
            <View style={styles.inputGroupFlex}>
              <Text style={styles.label}>
                Year obtained <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, !!errors[index]?.yearObtained && styles.inputError]}
                value={row.yearObtained}
                onChangeText={(v) => updateRow(index, { yearObtained: v })}
                placeholder={String(currentYear)}
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
              />
              {!!errors[index]?.yearObtained && (
                <Text style={styles.fieldError}>{errors[index].yearObtained}</Text>
              )}
            </View>
            <View style={styles.inputGroupFlex}>
              <Text style={styles.label}>Field of study</Text>
              <TextInput
                style={styles.input}
                value={row.fieldOfStudy}
                onChangeText={(v) => updateRow(index, { fieldOfStudy: v })}
                placeholder="e.g. Science, Mathematics"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
        </View>
      ))}

      {availableToAdd.length > 0 && (
        <View style={styles.addRow}>
          <Text style={styles.addLabel}>Add qualification:</Text>
          <View style={styles.addButtons}>
            {availableToAdd.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.addButton}
                onPress={() => addQualification(type)}
                activeOpacity={0.7}
              >
                <Text style={styles.addButtonText}>
                  + {EDUCATIONAL_QUALIFICATION_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {(formError || submitError) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{formError || submitError}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        {onBack && (
          <TouchableOpacity style={styles.secondaryButton} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={gradeTypeModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setGradeTypeModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setGradeTypeModal(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Grade type</Text>
            {gradeTypeModal !== null &&
              GRADE_TYPE_LIST.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={styles.modalOption}
                  onPress={() => {
                    updateRow(gradeTypeModal.rowIndex, { gradeType: t });
                    setGradeTypeModal(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalOptionText}>{GRADE_TYPE_LABELS[t]}</Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setGradeTypeModal(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    gap: 24,
  },
  intro: {
    fontSize: 14,
    color: '#64748b',
  },
  introItalic: {
    fontStyle: 'italic',
    fontWeight: '700',
  },
  muted: {
    fontSize: 14,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  requiredLabel: {
    fontWeight: '400',
    color: '#64748b',
  },
  removeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
  },
  inputGroup: {
    gap: 6,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroupFlex: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  required: {
    color: '#dc2626',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  fieldError: {
    fontSize: 12,
    color: '#dc2626',
  },
  pickerTouch: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: 16,
    color: '#0f172a',
  },
  pickerChevron: {
    fontSize: 10,
    color: '#64748b',
  },
  addRow: {
    gap: 8,
  },
  addLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  addButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#5fa8ff',
    minWidth: 100,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#0f172a',
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
