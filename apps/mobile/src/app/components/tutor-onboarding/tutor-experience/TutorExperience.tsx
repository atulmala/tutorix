import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { SAVE_TUTOR_EXPERIENCES } from '@tutorix/shared-graphql/mutations';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import {
  YearsOfExperienceEnum,
  YEARS_OF_EXPERIENCE_LIST,
  YEARS_OF_EXPERIENCE_LABELS,
  EmploymentType,
  EMPLOYMENT_TYPE_LIST,
  EMPLOYMENT_TYPE_LABELS,
} from '@tutorix/shared-utils';
import type { StepComponentProps } from '@tutorix/shared-utils';

interface ExperienceRow {
  id?: number;
  jobTitle: string;
  employerName: string;
  employerAddress: string;
  employmentType: EmploymentType;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

const currentYear = new Date().getFullYear();

const EMPLOYMENT_TYPE_BY_NUM: Record<number, EmploymentType> = {
  1: EmploymentType.FULL_TIME,
  2: EmploymentType.PART_TIME,
  3: EmploymentType.SELF_EMPLOYED,
  4: EmploymentType.FREELANCE,
  5: EmploymentType.INTERNSHIP,
  6: EmploymentType.TRAINEE,
};

function mapEmploymentType(v: string | number | null | undefined): EmploymentType {
  if (v == null) return EmploymentType.FULL_TIME;
  if (typeof v === 'number') return EMPLOYMENT_TYPE_BY_NUM[v] ?? EmploymentType.FULL_TIME;
  const found = Object.values(EmploymentType).find((x) => x === v);
  return found ?? EmploymentType.FULL_TIME;
}

const emptyExperience = (): ExperienceRow => ({
  jobTitle: '',
  employerName: '',
  employerAddress: '',
  employmentType: EmploymentType.FULL_TIME,
  startDate: '',
  endDate: '',
  isCurrent: false,
});

export const TutorExperience: React.FC<StepComponentProps> = () => {
  const [yearsOfExperience, setYearsOfExperience] = useState<YearsOfExperienceEnum>(
    YearsOfExperienceEnum.ZERO_TO_TWO
  );
  const [experiences, setExperiences] = useState<ExperienceRow[]>(() => [
    emptyExperience(),
  ]);
  const [errors, setErrors] = useState<
    Record<number, Partial<Record<keyof ExperienceRow, string>>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savingSectionIndex, setSavingSectionIndex] = useState<number | null>(null);
  const [employmentTypeModal, setEmploymentTypeModal] = useState<{
    rowIndex: number;
  } | null>(null);
  const [yearsModalVisible, setYearsModalVisible] = useState(false);

  const { data: profileData } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const profile = profileData?.myTutorProfile;
    if (profile?.yearsOfExperience != null) {
      const v = profile.yearsOfExperience;
      if (typeof v === 'number') {
        setYearsOfExperience(
          ([
            YearsOfExperienceEnum.ZERO_TO_TWO,
            YearsOfExperienceEnum.TWO_TO_FIVE,
            YearsOfExperienceEnum.FIVE_TO_TEN,
            YearsOfExperienceEnum.MORE_THAN_TEN,
          ] as const)[(v as number) - 1] ?? YearsOfExperienceEnum.ZERO_TO_TWO
        );
      } else {
        setYearsOfExperience(v as YearsOfExperienceEnum);
      }
    }
    const list = profile?.experiences;
    if (list?.length) {
      setExperiences(
        list.map(
          (e: {
            id?: number;
            jobTitle: string;
            employerName?: string | null;
            employerAddress?: string | null;
            employmentType: string;
            startDate: string;
            endDate?: string | null;
            isCurrent?: boolean;
          }) => ({
            id: e.id,
            jobTitle: e.jobTitle ?? '',
            employerName: e.employerName ?? '',
            employerAddress: e.employerAddress ?? '',
            employmentType: mapEmploymentType(e.employmentType),
            startDate: e.startDate ? e.startDate.slice(0, 10) : '',
            endDate: e.endDate ? e.endDate.slice(0, 10) : '',
            isCurrent: e.isCurrent ?? false,
          })
        )
      );
    } else if (list && list.length === 0 && profile?.yearsOfExperience) {
      setExperiences([emptyExperience()]);
    }
  }, [profileData?.myTutorProfile]);

  const [saveExperiences, { loading: isSubmitting }] = useMutation(
    SAVE_TUTOR_EXPERIENCES,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
      update: (cache, { data }, { variables }) => {
        if (!data?.saveTutorExperiences) return;
        const advanceToNextStep = variables?.input?.advanceToNextStep !== false;
        if (!advanceToNextStep) return;
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
                  certificationStage: 'offerings',
                },
              },
            });
          }
        } catch {
          /* ignore */
        }
      },
      onCompleted: (data) => {
        const saved = data?.saveTutorExperiences ?? [];
        if (saved.length > 0) {
          setExperiences((prev) =>
            prev.map((exp, i) => {
              const s = saved[i];
              if (s?.id != null) return { ...exp, id: s.id };
              return exp;
            })
          );
        }
      },
      onError: (error) => {
        setSubmitError(
          error.graphQLErrors?.[0]?.message ||
            error.message ||
            'Failed to save experiences. Please try again.'
        );
      },
    }
  );

  const updateRow = useCallback((index: number, updates: Partial<ExperienceRow>) => {
    setExperiences((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    );
    setErrors((prev) => {
      const next = { ...prev };
      const rowErrors = next[index];
      if (rowErrors) {
        const keys = Object.keys(updates) as (keyof ExperienceRow)[];
        keys.forEach((k) => delete rowErrors[k]);
        if (Object.keys(rowErrors).length === 0) delete next[index];
      }
      return next;
    });
  }, []);

  const addExperience = useCallback(() => {
    setExperiences((prev) => [...prev, emptyExperience()]);
  }, []);

  const validateRow = useCallback(
    (index: number): boolean => {
      setFormError(null);
      const row = experiences[index];
      if (!row) return false;
      const e: Partial<Record<keyof ExperienceRow, string>> = {};
      if (!row.jobTitle.trim()) e.jobTitle = 'Required';
      if (row.employmentType !== EmploymentType.SELF_EMPLOYED) {
        if (!row.employerName.trim()) e.employerName = 'Required';
        if (!row.employerAddress.trim()) e.employerAddress = 'Required';
      }
      if (!row.startDate.trim()) e.startDate = 'Required';
      else {
        const start = new Date(row.startDate);
        if (Number.isNaN(start.getTime())) e.startDate = 'Invalid date';
        else if (start.getFullYear() < 1950 || start.getFullYear() > currentYear)
          e.startDate = `Year must be between 1950 and ${currentYear}`;
      }
      if (!row.isCurrent && !row.endDate.trim()) {
        e.endDate = 'Required when not currently working';
      } else if (!row.isCurrent && row.endDate.trim()) {
        const end = new Date(row.endDate);
        if (Number.isNaN(end.getTime())) e.endDate = 'Invalid date';
        else if (row.startDate && new Date(row.startDate) > end)
          e.endDate = 'End date must be after start date';
      }
      if (Object.keys(e).length) {
        setErrors((prev) => ({ ...prev, [index]: e }));
        return false;
      }
      setErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return true;
    },
    [experiences]
  );

  const validate = useCallback((): boolean => {
    setFormError(null);
    let valid = true;
    const next: Record<number, Partial<Record<keyof ExperienceRow, string>>> = {};
    experiences.forEach((row, index) => {
      const e: Partial<Record<keyof ExperienceRow, string>> = {};
      if (!row.jobTitle.trim()) e.jobTitle = 'Required';
      if (row.employmentType !== EmploymentType.SELF_EMPLOYED) {
        if (!row.employerName.trim()) e.employerName = 'Required';
        if (!row.employerAddress.trim()) e.employerAddress = 'Required';
      }
      if (!row.startDate.trim()) e.startDate = 'Required';
      else {
        const start = new Date(row.startDate);
        if (Number.isNaN(start.getTime())) e.startDate = 'Invalid date';
        else if (start.getFullYear() < 1950 || start.getFullYear() > currentYear)
          e.startDate = `Year must be between 1950 and ${currentYear}`;
      }
      if (!row.isCurrent && !row.endDate.trim()) {
        e.endDate = 'Required when not currently working';
      } else if (!row.isCurrent && row.endDate.trim()) {
        const end = new Date(row.endDate);
        if (Number.isNaN(end.getTime())) e.endDate = 'Invalid date';
        else if (row.startDate && new Date(row.startDate) > end)
          e.endDate = 'End date must be after start date';
      }
      if (Object.keys(e).length) {
        next[index] = e;
        valid = false;
      }
    });
    setErrors(next);
    return valid;
  }, [experiences]);

  const buildExperiencesInput = () =>
    experiences.map((row) => ({
      id: row.id,
      jobTitle: row.jobTitle.trim(),
      employerName:
        row.employmentType === EmploymentType.SELF_EMPLOYED
          ? undefined
          : row.employerName.trim() || undefined,
      employerAddress:
        row.employmentType === EmploymentType.SELF_EMPLOYED
          ? undefined
          : row.employerAddress.trim() || undefined,
      employmentType: row.employmentType,
      startDate: row.startDate,
      endDate: row.isCurrent ? undefined : (row.endDate || undefined),
      isCurrent: row.isCurrent,
    }));

  const handleSaveSection = (index: number) => {
    setSubmitError(null);
    if (!validateRow(index)) return;
    setSavingSectionIndex(index);
    saveExperiences({
      variables: {
        input: {
          experiences: buildExperiencesInput(),
          yearsOfExperience,
          advanceToNextStep: false,
        },
      },
    }).finally(() => setSavingSectionIndex(null));
  };

  const handleSubmit = () => {
    setSubmitError(null);
    if (!validate()) return;
    saveExperiences({
      variables: {
        input: {
          experiences: buildExperiencesInput(),
          yearsOfExperience,
          advanceToNextStep: true,
        },
      },
    });
  };

  const formatDateInput = (value: string) => {
    let formatted = value.replace(/\D/g, '');
    if (formatted.length > 4) {
      formatted = formatted.slice(0, 4) + '-' + formatted.slice(4);
    }
    if (formatted.length > 7) {
      formatted = formatted.slice(0, 7) + '-' + formatted.slice(7, 9);
    }
    return formatted;
  };

  return (
    <View style={styles.block}>
      <Text style={styles.intro}>
        Add your teaching and work experience. You can add multiple experiences.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Years of experience <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.pickerTouch}
          onPress={() => setYearsModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.pickerText}>
            {YEARS_OF_EXPERIENCE_LABELS[yearsOfExperience]}
          </Text>
          <Text style={styles.pickerChevron}>▼</Text>
        </TouchableOpacity>
      </View>

      {experiences.map((row, index) => {
        const isSelfEmployed = row.employmentType === EmploymentType.SELF_EMPLOYED;
        return (
          <View key={row.id ?? `new-${index}`} style={styles.card}>
            <Text style={styles.cardTitle}>Experience {index + 1}</Text>

            {/* Row 1: Employment type and job title */}
            <View style={styles.rowTwoCols}>
              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>
                  Employment type <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.pickerTouch}
                  onPress={() => setEmploymentTypeModal({ rowIndex: index })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerText}>
                    {EMPLOYMENT_TYPE_LABELS[row.employmentType]}
                  </Text>
                  <Text style={styles.pickerChevron}>▼</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>
                  Job title <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    !!errors[index]?.jobTitle && styles.inputError,
                  ]}
                  value={row.jobTitle}
                  onChangeText={(v) => updateRow(index, { jobTitle: v })}
                  placeholder="e.g. Mathematics Teacher"
                  placeholderTextColor="#9ca3af"
                />
                {!!errors[index]?.jobTitle && (
                  <Text style={styles.fieldError}>{errors[index].jobTitle}</Text>
                )}
              </View>
            </View>

            {/* Row 2: Employer name (when not self-employed) */}
            {!isSelfEmployed && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Employer name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    !!errors[index]?.employerName && styles.inputError,
                  ]}
                  value={row.employerName}
                  onChangeText={(v) => updateRow(index, { employerName: v })}
                  placeholder="e.g. ABC School, XYZ Institute"
                  placeholderTextColor="#9ca3af"
                />
                {!!errors[index]?.employerName && (
                  <Text style={styles.fieldError}>
                    {errors[index].employerName}
                  </Text>
                )}
              </View>
            )}

            {/* Row 3: Employer address (when not self-employed) */}
            {!isSelfEmployed && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Employer address <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    !!errors[index]?.employerAddress && styles.inputError,
                  ]}
                  value={row.employerAddress}
                  onChangeText={(v) => updateRow(index, { employerAddress: v })}
                  placeholder="Full address of the employer"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />
                {!!errors[index]?.employerAddress && (
                  <Text style={styles.fieldError}>
                    {errors[index].employerAddress}
                  </Text>
                )}
              </View>
            )}

            {/* Row 4a: Start date, End date */}
            <View style={styles.rowTwoCols}>
              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>
                  Start date <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    !!errors[index]?.startDate && styles.inputError,
                  ]}
                  value={row.startDate}
                  onChangeText={(v) =>
                    updateRow(index, { startDate: formatDateInput(v) })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                />
                {!!errors[index]?.startDate && (
                  <Text style={styles.fieldError}>{errors[index].startDate}</Text>
                )}
              </View>
              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>
                  End date{!row.isCurrent && <Text style={styles.required}> *</Text>}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    !!errors[index]?.endDate && styles.inputError,
                    row.isCurrent && styles.inputDisabled,
                  ]}
                  value={row.endDate}
                  onChangeText={(v) =>
                    updateRow(index, { endDate: formatDateInput(v) })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                  editable={!row.isCurrent}
                />
                {!!errors[index]?.endDate && (
                  <Text style={styles.fieldError}>{errors[index].endDate}</Text>
                )}
              </View>
            </View>

            {/* Row 4b: Currently working, Save button */}
            <View style={styles.currentlyWorkingSaveRow}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Currently working</Text>
                <Switch
                  value={row.isCurrent}
                  onValueChange={(v) => updateRow(index, { isCurrent: v })}
                  trackColor={{ false: '#e2e8f0', true: '#5fa8ff' }}
                  thumbColor="#fff"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.sectionSaveButton,
                  isSubmitting && styles.sectionSaveButtonDisabled,
                ]}
                onPress={() => handleSaveSection(index)}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                {savingSectionIndex === index ? (
                  <ActivityIndicator size="small" color="#0f172a" />
                ) : (
                  <Text style={styles.sectionSaveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={styles.addButton}
        onPress={addExperience}
        activeOpacity={0.7}
      >
        <Text style={styles.addButtonText}>Add More</Text>
      </TouchableOpacity>

      {(formError || submitError) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{formError || submitError}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
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

      {/* Employment type picker modal */}
      <Modal
        visible={employmentTypeModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEmploymentTypeModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEmploymentTypeModal(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Employment type</Text>
            {employmentTypeModal !== null &&
              EMPLOYMENT_TYPE_LIST.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={styles.modalOption}
                  onPress={() => {
                    updateRow(employmentTypeModal.rowIndex, {
                      employmentType: t,
                    });
                    setEmploymentTypeModal(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalOptionText}>
                    {EMPLOYMENT_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setEmploymentTypeModal(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Years of experience picker modal */}
      <Modal
        visible={yearsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setYearsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setYearsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Years of experience</Text>
            {YEARS_OF_EXPERIENCE_LIST.map((v) => (
              <TouchableOpacity
                key={v}
                style={styles.modalOption}
                onPress={() => {
                  setYearsOfExperience(v);
                  setYearsModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalOptionText}>
                  {YEARS_OF_EXPERIENCE_LABELS[v]}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setYearsModalVisible(false)}
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
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    gap: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  inputGroup: {
    gap: 6,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  rowThreeCols: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputGroupFlex: {
    flex: 1,
    minWidth: 100,
    gap: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentlyWorkingSaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  textArea: {
    minHeight: 80,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: '#f1f5f9',
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
  sectionSaveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  sectionSaveButtonDisabled: {
    opacity: 0.6,
  },
  sectionSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
