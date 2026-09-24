import React, { useEffect } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { TUTOR_SEARCH_DETAIL } from '@tutorix/shared-graphql/queries';
import { formatInr } from '@tutorix/shared-utils/rate-card';
import {
  formatExperienceDuration,
  formatExperiencePeriod,
  formatQualificationInstitutionGrade,
  formatQualificationTitle,
  monthsToExperienceDuration,
} from '@tutorix/shared-utils/tutor-detail-formatters';
import { analytics } from '../../../lib/analytics';

type StudentTutorPreviewScreenProps = {
  tutorId: string;
  offeringId: string;
  onBookClass: () => void;
};

type PreviewExperience = {
  jobTitle: string;
  employerName?: string | null;
  employerAddress?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
};

type PreviewQualification = {
  qualificationType: string;
  degreeName?: string | null;
  gradeType: string;
  gradeValue: string;
  boardOrUniversity: string;
};

export const StudentTutorPreviewScreen: React.FC<StudentTutorPreviewScreenProps> = ({
  tutorId,
  offeringId,
  onBookClass,
}) => {
  const { data, loading, error } = useQuery(TUTOR_SEARCH_DETAIL, {
    variables: { tutorId, offeringId },
    fetchPolicy: 'network-only',
  });
  const detail = data?.tutorSearchDetail;

  useEffect(() => {
    if (detail?.tutorId) {
      analytics.trackTutorViewed(detail.tutorId);
    }
  }, [detail?.tutorId]);

  if (loading) {
    return <Text style={styles.hint}>Loading tutor…</Text>;
  }
  if (error || !detail) {
    return <Text style={styles.hint}>Could not load this tutor.</Text>;
  }

  const experience =
    detail.totalExperienceMonths > 0
      ? formatExperienceDuration(monthsToExperienceDuration(detail.totalExperienceMonths))
      : '';
  const recentExperiences = (detail.recentExperiences ?? []) as PreviewExperience[];
  const topQualifications = (detail.topQualifications ?? []) as PreviewQualification[];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          {detail.photoUrl ? (
            <Image source={{ uri: detail.photoUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photoFallback}>
              <Text style={styles.photoFallbackText}>{detail.displayName.slice(0, 1)}</Text>
            </View>
          )}
          <View style={styles.headerCopy}>
            <Text style={styles.name}>{detail.displayName}</Text>
            {experience ? <Text style={styles.meta}>{experience}</Text> : null}
            <Text style={styles.meta}>
              {[
                detail.city,
                detail.distanceKm != null ? `${detail.distanceKm.toFixed(1)} km` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {detail.hasAvailabilityThisWeek ? (
              <Text style={styles.available}>
                Available this week · {detail.slotsThisWeek} slot
                {detail.slotsThisWeek === 1 ? '' : 's'}
              </Text>
            ) : (
              <Text style={styles.meta}>No slots listed for this week yet.</Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.section}>This subject</Text>
        <Text style={styles.meta}>{detail.matchingOffering.offeringLabel}</Text>
        {detail.matchingOffering.offlineRateInr ? (
          <Text style={styles.meta}>
            Offline {formatInr(detail.matchingOffering.offlineRateInr)} / class
          </Text>
        ) : null}
        {detail.matchingOffering.onlineRateInr ? (
          <Text style={styles.meta}>
            Online {formatInr(detail.matchingOffering.onlineRateInr)} / class
          </Text>
        ) : null}
        {detail.matchingOffering.freeDemoOffered ? (
          <Text style={styles.available}>Free demo</Text>
        ) : null}
        <Pressable
          style={styles.bookButton}
          onPress={onBookClass}
          accessibilityRole="button"
          accessibilityLabel="Book class"
        >
          <Text style={styles.bookButtonText}>Book class</Text>
        </Pressable>
      </View>
      {recentExperiences.length ? (
        <View style={styles.card}>
          <Text style={styles.section}>Experience</Text>
          {recentExperiences.map((exp, index) => (
            <View key={`${exp.jobTitle}-${index}`} style={styles.item}>
              <Text style={styles.itemTitle}>{exp.employerName || 'Self-employed'}</Text>
              {exp.employerAddress ? (
                <Text style={styles.meta}>{exp.employerAddress}</Text>
              ) : null}
              <Text style={styles.meta}>{formatExperiencePeriod(exp)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {topQualifications.length ? (
        <View style={styles.card}>
          <Text style={styles.section}>Education</Text>
          {topQualifications.map((qual, index) => {
            const institutionGrade = formatQualificationInstitutionGrade(
              qual.boardOrUniversity,
              qual.gradeType,
              qual.gradeValue,
            );
            return (
              <View key={`${qual.qualificationType}-${index}`} style={styles.item}>
                <Text style={styles.itemTitle}>
                  {formatQualificationTitle(qual.qualificationType, qual.degreeName)}
                </Text>
                {institutionGrade ? <Text style={styles.meta}>{institutionGrade}</Text> : null}
              </View>
            );
          })}
        </View>
      ) : null}
      {detail.otherOfferings?.length ? (
        <View style={styles.card}>
          <Text style={styles.section}>Also teaches</Text>
          {detail.otherOfferings.map((offering: { offeringId: string; offeringLabel: string }) => (
            <Text key={offering.offeringId} style={styles.meta}>
              {offering.offeringLabel}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photo: { width: 88, height: 88, borderRadius: 44 },
  photoFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackText: { fontSize: 28, fontWeight: '700', color: '#143055' },
  headerCopy: { flex: 1, minWidth: 0 },
  name: { fontSize: 22, fontWeight: '700', color: '#143055' },
  section: { fontSize: 16, fontWeight: '700', color: '#143055', marginBottom: 8 },
  item: { marginTop: 10 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#143055' },
  meta: { marginTop: 6, color: '#6b7280', fontSize: 14 },
  available: { marginTop: 8, color: '#16a34a', fontWeight: '700' },
  bookButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bookButtonText: { color: '#fff', fontWeight: '700' },
  hint: { padding: 24, color: '#6b7280', textAlign: 'center' },
});
