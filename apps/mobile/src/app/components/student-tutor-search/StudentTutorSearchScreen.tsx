import React, { useEffect, useMemo, useState } from 'react';
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

  const [offeringId, setOfferingId] = useState<number | null>(null);
  const [studyArea, setStudyArea] = useState('SCHOOL_EDUCATION');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'ANY' | 'ONLINE' | 'OFFLINE'>('ANY');
  const [classFormat, setClassFormat] = useState<'ANY' | 'INDIVIDUAL' | 'GROUP'>('ANY');
  const [maxRateText, setMaxRateText] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);

  useEffect(() => {
    if (!educationPath) return;
    setStudyArea(educationPath.studyAreaKey);
    setSelectedIds(
      [educationPath.boardOfferingId, educationPath.classOfferingId].filter(
        (id): id is number => id != null,
      ),
    );
  }, [educationPath]);

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
  const subjectLabel = offerings.find((o) => o.id === offeringId)?.displayName ?? 'Choose a subject';

  useEffect(() => {
    if (!offeringId || !connection) return;
    analytics.trackTutorSearch(subjectLabel, { deliveryMode, classFormat, radiusKm }, hits.length);
  }, [classFormat, connection, deliveryMode, hits.length, offeringId, radiusKm, subjectLabel]);

  const rootOfferings = offerings.filter((o) => o.parentOffering == null);
  const studyOpt = STUDY_AREAS_OPTIONS.find((o) => o.key === studyArea);
  const rootOffering =
    studyOpt &&
    rootOfferings.find((o) => o.displayName === studyOpt.label || o.name === studyOpt.label);
  const levelsConfig = studyArea ? STUDY_AREAS[studyArea] ?? [] : [];
  const getChildren = (parentId: number) =>
    offerings.filter((o) => o.parentOffering && String(o.parentOffering.id) === String(parentId));

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.welcomeTitle}>Find a tutor</Text>
      <Text style={styles.subtitle}>
        Pick a subject when you are ready. Filters stay optional.
      </Text>
      <Pressable style={styles.subjectChip} onPress={() => setPickerOpen(true)}>
        <Text style={styles.subjectChipText}>{subjectLabel}</Text>
      </Pressable>
      {selectedIds.length > 0 ? (
        <View style={styles.chipRow}>
          {selectedIds.map((id) => {
            const offering = offerings.find((o) => o.id === id);
            if (!offering) return null;
            return (
              <Pressable
                key={id}
                style={styles.chip}
                onPress={() => setPickerOpen(true)}
              >
                <Text style={styles.chipText}>{offering.displayName}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={styles.chipRow}>
        {(['ANY', 'OFFLINE', 'ONLINE'] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.chip, deliveryMode === value && styles.chipOn]}
            onPress={() => setDeliveryMode(value)}
          >
            <Text style={styles.chipText}>
              {value === 'ANY' ? 'Both' : value === 'OFFLINE' ? 'Offline' : 'Online'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.chipRow}>
        {(['ANY', 'INDIVIDUAL', 'GROUP'] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.chip, classFormat === value && styles.chipOn]}
            onPress={() => setClassFormat(value)}
          >
            <Text style={styles.chipText}>
              {value === 'ANY' ? 'Any class' : value === 'INDIVIDUAL' ? '1:1' : 'Group'}
            </Text>
          </Pressable>
        ))}
      </View>
      {deliveryMode !== 'ONLINE' ? (
        <View style={styles.chipRow}>
          {[5, 10, 15, 25].map((km) => (
            <Pressable
              key={km}
              style={[styles.chip, radiusKm === km && styles.chipOn]}
              onPress={() => setRadiusKm(km)}
            >
              <Text style={styles.chipText}>{km} km</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextInput
        style={styles.budget}
        keyboardType="number-pad"
        placeholder="Budget ₹ / class (optional)"
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
        hits.map((hit: {
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
        ))
      )}

      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>What do you want to learn?</Text>
            <ScrollView>
              {STUDY_AREAS_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[styles.option, studyArea === opt.key && styles.chipOn]}
                  onPress={() => {
                    setStudyArea(opt.key);
                    setSelectedIds([]);
                  }}
                >
                  <Text style={styles.chipText}>{opt.label}</Text>
                </Pressable>
              ))}
              {rootOffering
                ? levelsConfig.map((level, index) => {
                    const parentId = index === 0 ? rootOffering.id : selectedIds[index - 1];
                    const children = parentId ? getChildren(parentId) : [];
                    return (
                      <View key={level.name} style={{ marginTop: 12 }}>
                        <Text style={styles.sheetTitle}>{level.name}</Text>
                        {children.map((child) => (
                          <Pressable
                            key={child.id}
                            style={[
                              styles.option,
                              selectedIds[index] === child.id && styles.chipOn,
                            ]}
                            onPress={() =>
                              setSelectedIds((prev) => {
                                const next = prev.slice(0, index + 1);
                                next[index] = child.id;
                                return next;
                              })
                            }
                          >
                            <Text style={styles.chipText}>{child.displayName}</Text>
                          </Pressable>
                        ))}
                      </View>
                    );
                  })
                : null}
            </ScrollView>
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setPickerOpen(false)}>
                <Text style={styles.hint}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const leaf = selectedIds[selectedIds.length - 1];
                  if (!leaf || selectedIds.length !== levelsConfig.length) return;
                  setOfferingId(leaf);
                  setPickerOpen(false);
                }}
              >
                <Text style={styles.link}>Show tutors</Text>
              </Pressable>
            </View>
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
  subjectChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderColor: '#5fa8ff',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  subjectChipText: { fontWeight: '700', color: '#143055' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipOn: { borderColor: '#5fa8ff', backgroundColor: '#eff6ff' },
  chipText: { color: '#143055', fontWeight: '600', fontSize: 13 },
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
  sheetWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    padding: 20,
  },
  sheetTitle: { fontWeight: '700', color: '#143055', marginBottom: 8, textTransform: 'capitalize' },
  option: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});
