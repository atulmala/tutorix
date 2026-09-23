import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { GET_MY_STUDENT_PROFILE, GET_OFFERINGS } from '@tutorix/shared-graphql/queries';
import { mapStudentEducationToOfferingPath } from '@tutorix/shared-utils/student-education-offering';
import {
  cascadeFieldLabel,
  STUDY_AREAS,
  STUDY_AREAS_OPTIONS,
} from '@tutorix/shared-utils/study-areas.constants';
import {
  readStudentTutorSearchDraft,
  writeStudentTutorSearchDraft,
} from './student-tutor-search-draft';
import type { StudentTutorSearchParams } from './student-tutor-search-params';

type StudentTutorSearchScreenProps = {
  onSearch: (params: StudentTutorSearchParams) => void;
};

type OfferingNode = {
  id: number;
  name?: string;
  displayName: string;
  level: number;
  order?: number;
  parentOffering?: { id: number } | null;
};

type PickerTarget = { kind: 'studyArea' } | { kind: 'level'; index: number };

const STUDY_MODE_OPTIONS: { value: 'OFFLINE' | 'ONLINE' | 'ANY'; label: string }[] = [
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'ANY', label: 'Any' },
];

const GROUP_PREFERENCE_OPTIONS: { value: 'INDIVIDUAL' | 'GROUP' | 'ANY'; label: string }[] = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'GROUP', label: 'Group' },
  { value: 'ANY', label: 'Any' },
];

function sortOfferings(nodes: OfferingNode[]): OfferingNode[] {
  return [...nodes].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.displayName.localeCompare(b.displayName);
  });
}

type DropdownFieldProps = {
  label: string;
  value?: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
};

const DropdownField: React.FC<DropdownFieldProps> = ({
  label,
  value,
  placeholder,
  disabled,
  onPress,
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Pressable
      style={[styles.dropdown, disabled && styles.dropdownDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}
        numberOfLines={1}
      >
        {value ?? placeholder}
      </Text>
      <Text style={styles.chevron}>▼</Text>
    </Pressable>
  </View>
);

function pairFields<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

export const StudentTutorSearchScreen: React.FC<StudentTutorSearchScreenProps> = ({
  onSearch,
}) => {
  const { data: profileData } = useQuery(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: offeringsData } = useQuery<{ offerings: OfferingNode[] }>(GET_OFFERINGS, {
    fetchPolicy: 'cache-first',
  });

  const student = profileData?.myStudentProfile;
  const offerings = useMemo(
    () => offeringsData?.offerings ?? [],
    [offeringsData?.offerings],
  );

  const educationPath = useMemo(
    () =>
      mapStudentEducationToOfferingPath(
        student?.board,
        student?.schoolClass,
        offerings,
        student?.boardOther,
      ),
    [offerings, student?.board, student?.boardOther, student?.schoolClass],
  );

  const restored = readStudentTutorSearchDraft();
  const restoredHasUserCascade = Boolean(
    restored &&
      (restored.studyArea !== 'SCHOOL_EDUCATION' || restored.selectedIds.length > 0),
  );
  const [studyArea, setStudyArea] = useState(restored?.studyArea ?? 'SCHOOL_EDUCATION');
  const [selectedIds, setSelectedIds] = useState<number[]>(restored?.selectedIds ?? []);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'ANY' | 'ONLINE' | 'OFFLINE'>(
    restored?.deliveryMode ?? 'ANY',
  );
  const [classFormat, setClassFormat] = useState<'ANY' | 'INDIVIDUAL' | 'GROUP'>(
    restored?.classFormat ?? 'ANY',
  );
  const [maxRateText, setMaxRateText] = useState(restored?.maxRateText ?? '');
  const [radiusKm, setRadiusKm] = useState(restored?.radiusKm ?? 10);
  const educationAppliedRef = useRef(restoredHasUserCascade);

  useEffect(() => {
    writeStudentTutorSearchDraft({
      studyArea,
      selectedIds,
      deliveryMode,
      classFormat,
      maxRateText,
      radiusKm,
    });
  }, [classFormat, deliveryMode, maxRateText, radiusKm, selectedIds, studyArea]);

  useEffect(() => {
    if (student == null) return;
    if (student.studentType !== 'SCHOOL') {
      educationAppliedRef.current = true;
      return;
    }
    if (!educationPath || educationAppliedRef.current) return;
    educationAppliedRef.current = true;
    setStudyArea(educationPath.studyAreaKey);
    setSelectedIds(
      [educationPath.boardOfferingId, educationPath.classOfferingId].filter(
        (id): id is number => id != null,
      ),
    );
  }, [educationPath, student]);

  const levelsConfig = studyArea ? STUDY_AREAS[studyArea] ?? [] : [];
  const offeringId =
    levelsConfig.length > 0 && selectedIds.length === levelsConfig.length
      ? selectedIds[levelsConfig.length - 1]
      : null;

  const rootOfferings = offerings.filter((o) => o.parentOffering == null);
  const studyOpt = STUDY_AREAS_OPTIONS.find((o) => o.key === studyArea);
  const rootOffering =
    studyOpt &&
    rootOfferings.find((o) => o.displayName === studyOpt.label || o.name === studyOpt.label);
  const getChildren = (parentId: number) =>
    sortOfferings(
      offerings.filter((o) => o.parentOffering && String(o.parentOffering.id) === String(parentId)),
    );

  const studyAreaLabel = studyOpt?.label ?? 'Select study area';

  const pickerTitle =
    picker?.kind === 'studyArea'
      ? 'Study area'
      : picker
        ? cascadeFieldLabel(studyArea, levelsConfig[picker.index]?.name ?? '')
        : '';

  const pickerOptions: { key: string; label: string; selected: boolean; onSelect: () => void }[] =
    picker?.kind === 'studyArea'
      ? STUDY_AREAS_OPTIONS.map((opt) => ({
          key: opt.key,
          label: opt.label,
          selected: studyArea === opt.key,
          onSelect: () => {
            if (opt.key !== studyArea) {
              setStudyArea(opt.key);
              setSelectedIds([]);
            }
            setPicker(null);
          },
        }))
      : picker
        ? (() => {
            const parentId =
              picker.index === 0 ? rootOffering?.id : selectedIds[picker.index - 1];
            if (!parentId) return [];
            return getChildren(parentId).map((child) => ({
              key: String(child.id),
              label: child.displayName,
              selected: selectedIds[picker.index] === child.id,
              onSelect: () => {
                setSelectedIds((prev) => {
                  if (prev[picker.index] === child.id) return prev;
                  const next = prev.slice(0, picker.index);
                  next[picker.index] = child.id;
                  return next;
                });
                setPicker(null);
              },
            }));
          })()
        : [];

  const handleSearch = () => {
    if (!offeringId) return;
    onSearch({
      offeringId: String(offeringId),
      deliveryMode,
      classFormat,
      maxRateInr: maxRateText ? Number(maxRateText) : undefined,
      radiusKm,
      sortBy: 'BEST_MATCH',
    });
  };

  const cascadeFields = levelsConfig.map((level, index) => {
    const parentReady = index === 0 ? Boolean(rootOffering) : Boolean(selectedIds[index - 1]);
    const selected = offerings.find((o) => o.id === selectedIds[index]);
    const label = cascadeFieldLabel(studyArea, level.name);
    return {
      key: level.name,
      label,
      value: selected?.displayName,
      placeholder: `Select ${label.toLowerCase()}`,
      disabled: !parentReady,
      onPress: () => parentReady && setPicker({ kind: 'level', index }),
    };
  });

  const fieldRows = pairFields([
    {
      key: 'studyArea',
      label: 'Study area',
      value: studyAreaLabel,
      placeholder: 'Select study area',
      disabled: false,
      onPress: () => setPicker({ kind: 'studyArea' }),
    },
    ...cascadeFields,
  ]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.welcomeTitle}>Find a tutor</Text>
      <Text style={styles.subtitle}>
        We start from your class details. Choose a subject, then search.
      </Text>

      {fieldRows.map((row) => (
        <View key={row.map((field) => field.key).join('-')} style={styles.fieldRow}>
          {row.map((field) => (
            <DropdownField
              key={field.key}
              label={field.label}
              value={field.value}
              placeholder={field.placeholder}
              disabled={field.disabled}
              onPress={field.onPress}
            />
          ))}
        </View>
      ))}

      <Text style={styles.fieldLabel}>Study Mode</Text>
      <View style={styles.segmentRow}>
        {STUDY_MODE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.segment, deliveryMode === opt.value && styles.segmentOn]}
            onPress={() => setDeliveryMode(opt.value)}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: deliveryMode === opt.value }}
          >
            <Text style={[styles.segmentText, deliveryMode === opt.value && styles.segmentTextOn]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Group Preference</Text>
      <View style={styles.segmentRow}>
        {GROUP_PREFERENCE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.segment, classFormat === opt.value && styles.segmentOn]}
            onPress={() => setClassFormat(opt.value)}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: classFormat === opt.value }}
          >
            <Text style={[styles.segmentText, classFormat === opt.value && styles.segmentTextOn]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {deliveryMode !== 'ONLINE' ? (
        <>
          <Text style={styles.fieldLabel}>Distance</Text>
          <View style={styles.segmentRow}>
            {[5, 10, 15, 25].map((km) => (
              <Pressable
                key={km}
                style={[styles.segment, radiusKm === km && styles.segmentOn]}
                onPress={() => setRadiusKm(km)}
                accessibilityRole="button"
                accessibilityLabel={`${km} km`}
              >
                <Text style={[styles.segmentText, radiusKm === km && styles.segmentTextOn]}>
                  {km} km
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.fieldLabel}>Budget (optional)</Text>
      <TextInput
        style={styles.budget}
        keyboardType="number-pad"
        placeholder="Max ₹ / class"
        placeholderTextColor="#9ca3af"
        value={maxRateText}
        onChangeText={setMaxRateText}
        accessibilityLabel="Budget"
      />

      {!offeringId ? (
        <Text style={styles.hint}>Choose a subject to search for certified tutors.</Text>
      ) : null}

      <Pressable
        style={[styles.searchButton, !offeringId && styles.searchButtonDisabled]}
        onPress={handleSearch}
        disabled={!offeringId}
        accessibilityRole="button"
        accessibilityLabel="Search"
        accessibilityState={{ disabled: !offeringId }}
      >
        <Text style={styles.searchButtonText}>Search</Text>
      </Pressable>

      <Modal visible={picker !== null} animationType="slide" transparent>
        <View style={styles.sheetWrap}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setPicker(null)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{pickerTitle}</Text>
            <ScrollView>
              {pickerOptions.length === 0 ? (
                <Text style={styles.hint}>No options yet.</Text>
              ) : (
                pickerOptions.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[styles.option, opt.selected && styles.optionOn]}
                    onPress={opt.onSelect}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                  >
                    <Text style={styles.optionText}>{opt.label}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Pressable style={styles.sheetCancel} onPress={() => setPicker(null)}>
              <Text style={styles.hint}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingBottom: 48 },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: '#143055' },
  subtitle: { marginTop: 6, marginBottom: 16, fontSize: 14, color: '#6b7280', lineHeight: 20 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, minWidth: 0 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#143055',
    marginBottom: 8,
    marginTop: 4,
  },
  dropdown: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dropdownDisabled: { backgroundColor: '#f8fafc' },
  dropdownText: { flex: 1, fontSize: 14, color: '#143055', paddingVertical: 10, paddingRight: 8 },
  dropdownPlaceholder: { color: '#9ca3af' },
  chevron: { fontSize: 10, color: '#9ca3af' },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segmentOn: { borderColor: '#5fa8ff', backgroundColor: '#eff6ff' },
  segmentText: { color: '#143055', fontWeight: '600', fontSize: 13 },
  segmentTextOn: { color: '#1d4ed8' },
  budget: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#143055',
  },
  hint: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginTop: 8 },
  searchButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  searchButtonDisabled: { opacity: 0.5 },
  searchButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    padding: 20,
  },
  sheetTitle: { fontWeight: '700', color: '#143055', marginBottom: 12, fontSize: 16 },
  option: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  optionOn: { borderColor: '#5fa8ff', backgroundColor: '#eff6ff' },
  optionText: { color: '#143055', fontWeight: '600', fontSize: 15 },
  sheetCancel: { alignItems: 'center', paddingTop: 4 },
});
