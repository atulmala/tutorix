import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@apollo/client';
import {
  GET_MY_STUDENT_PROFILE,
  GET_OFFERINGS,
  SEARCH_TUTORS,
} from '@tutorix/shared-graphql/queries';
import {
  cascadeFieldLabel,
  formatInr,
  mapStudentEducationToOfferingPath,
  STUDY_AREAS,
  STUDY_AREAS_OPTIONS,
  YEARS_OF_EXPERIENCE_LABELS,
  YearsOfExperienceEnum,
} from '@tutorix/shared-utils';
import { analytics } from '../../../lib/analytics';

type StudentTutorSearchScreenProps = {
  onOpenTutorPreview: (tutorId: string, offeringId: string) => void;
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

export const StudentTutorSearchScreen: React.FC<StudentTutorSearchScreenProps> = ({
  onOpenTutorPreview,
}) => {
  const { data: profileData } = useQuery(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: offeringsData } = useQuery<{ offerings: OfferingNode[] }>(GET_OFFERINGS, {
    fetchPolicy: 'cache-first',
  });

  const student = profileData?.myStudentProfile;
  const offerings = offeringsData?.offerings ?? [];

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

  const [studyArea, setStudyArea] = useState('SCHOOL_EDUCATION');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'ANY' | 'ONLINE' | 'OFFLINE'>('ANY');
  const [classFormat, setClassFormat] = useState<'ANY' | 'INDIVIDUAL' | 'GROUP'>('ANY');
  const [maxRateText, setMaxRateText] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const educationAppliedRef = useRef(false);

  useEffect(() => {
    if (!educationPath || educationAppliedRef.current) return;
    educationAppliedRef.current = true;
    setStudyArea(educationPath.studyAreaKey);
    setSelectedIds(
      [educationPath.boardOfferingId, educationPath.classOfferingId].filter(
        (id): id is number => id != null,
      ),
    );
  }, [educationPath]);

  const levelsConfig = studyArea ? STUDY_AREAS[studyArea] ?? [] : [];
  const offeringId =
    levelsConfig.length > 0 && selectedIds.length === levelsConfig.length
      ? selectedIds[levelsConfig.length - 1]
      : null;

  const searchInput = offeringId
    ? {
        offeringId: String(offeringId),
        deliveryMode,
        classFormat,
        maxRateInr: maxRateText ? Number(maxRateText) : undefined,
        radiusKm,
        sortBy: 'BEST_MATCH',
      }
    : undefined;

  const { data: searchData, loading } = useQuery(SEARCH_TUTORS, {
    variables: { input: searchInput },
    skip: !searchInput,
    fetchPolicy: 'network-only',
  });
  const connection = searchData?.searchTutors;
  const hits = connection?.items ?? [];
  const subjectLabel =
    offerings.find((o) => o.id === offeringId)?.displayName ?? 'Choose a subject';

  useEffect(() => {
    if (!offeringId || !connection) return;
    analytics.trackTutorSearch(subjectLabel, { deliveryMode, classFormat, radiusKm }, hits.length);
  }, [classFormat, connection, deliveryMode, hits.length, offeringId, radiusKm, subjectLabel]);

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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.welcomeTitle}>Find a tutor</Text>
      <Text style={styles.subtitle}>
        We start from your class details. Choose a subject to see tutors.
      </Text>

      <Text style={styles.fieldLabel}>Study area</Text>
      <Pressable
        style={styles.dropdown}
        onPress={() => setPicker({ kind: 'studyArea' })}
        accessibilityRole="button"
        accessibilityLabel="Study area"
      >
        <Text style={styles.dropdownText}>{studyAreaLabel}</Text>
        <Text style={styles.chevron}>▼</Text>
      </Pressable>

      {levelsConfig.map((level, index) => {
        const parentReady = index === 0 ? Boolean(rootOffering) : Boolean(selectedIds[index - 1]);
        const selected = offerings.find((o) => o.id === selectedIds[index]);
        const label = cascadeFieldLabel(studyArea, level.name);
        const placeholder = `Select ${label.toLowerCase()}`;
        return (
          <View key={level.name}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Pressable
              style={[styles.dropdown, !parentReady && styles.dropdownDisabled]}
              onPress={() => parentReady && setPicker({ kind: 'level', index })}
              disabled={!parentReady}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <Text
                style={[styles.dropdownText, !selected && styles.dropdownPlaceholder]}
                numberOfLines={1}
              >
                {selected?.displayName ?? placeholder}
              </Text>
              <Text style={styles.chevron}>▼</Text>
            </Pressable>
          </View>
        );
      })}

      <Text style={styles.fieldLabel}>Study Mode</Text>
      <View style={styles.segmentRow}>
        {STUDY_MODE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.segment, deliveryMode === opt.value && styles.segmentOn]}
            onPress={() => setDeliveryMode(opt.value)}
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
      />

      {connection?.forcedOnlineOnly ? (
        <Text style={styles.hint}>
          Add a mapped home address to search nearby offline tutors. Showing online matches.
        </Text>
      ) : null}

      {!offeringId ? (
        <Text style={styles.hint}>Choose a subject to see certified tutors.</Text>
      ) : loading ? (
        <Text style={styles.hint}>Finding tutors…</Text>
      ) : hits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.hint}>No tutors match these filters yet.</Text>
          {deliveryMode === 'OFFLINE' ? (
            <Pressable onPress={() => setDeliveryMode('ANY')}>
              <Text style={styles.link}>Include online tutors</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        hits.map(
          (hit: {
            tutorId: string;
            displayName: string;
            photoUrl?: string | null;
            yearsOfExperience?: string;
            offeringLabel: string;
            matchingOfferingId: string;
            rateInr: number;
            deliveryModeShown: string;
            distanceKm?: number | null;
            freeDemoOffered: boolean;
            hasAvailabilityThisWeek: boolean;
            groupSize: number;
          }) => (
            <Pressable
              key={String(hit.tutorId)}
              style={styles.card}
              onPress={() => {
                analytics.trackTutorViewed(hit.tutorId);
                onOpenTutorPreview(String(hit.tutorId), String(hit.matchingOfferingId));
              }}
            >
              {hit.photoUrl ? (
                <Image source={{ uri: hit.photoUrl }} style={styles.photo} />
              ) : null}
              <Text style={styles.cardName}>{hit.displayName}</Text>
              {hit.hasAvailabilityThisWeek ? (
                <Text style={styles.available}>Available this week</Text>
              ) : null}
              <Text style={styles.cardMeta}>{hit.offeringLabel}</Text>
              <Text style={styles.cardMeta}>
                {hit.deliveryModeShown === 'OFFLINE'
                  ? hit.distanceKm != null
                    ? `${hit.distanceKm.toFixed(1)} km`
                    : 'Offline'
                  : 'Online'}
                {' · '}
                {hit.groupSize > 1 ? `Group of ${hit.groupSize}` : '1:1'}
                {hit.freeDemoOffered ? ' · Free demo' : ''}
              </Text>
              {hit.yearsOfExperience ? (
                <Text style={styles.cardMeta}>
                  {YEARS_OF_EXPERIENCE_LABELS[hit.yearsOfExperience as YearsOfExperienceEnum] ?? ''}
                </Text>
              ) : null}
              <Text style={styles.rate}>{formatInr(hit.rateInr)} / class</Text>
              <Text style={styles.link}>View profile</Text>
            </Pressable>
          ),
        )
      )}

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
  link: { color: '#4a97f5', fontWeight: '700', marginTop: 8 },
  empty: { padding: 24, alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  photo: { width: 64, height: 64, borderRadius: 32, marginBottom: 10 },
  cardName: { fontSize: 18, fontWeight: '700', color: '#143055' },
  available: { color: '#16a34a', fontWeight: '700', marginTop: 4, fontSize: 12 },
  cardMeta: { color: '#6b7280', marginTop: 4, fontSize: 13 },
  rate: { marginTop: 8, fontWeight: '700', color: '#143055' },
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
