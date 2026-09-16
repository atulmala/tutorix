import React, { useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { TUTOR_SEARCH_DETAIL } from '@tutorix/shared-graphql/queries';
import {
  formatInr,
  YEARS_OF_EXPERIENCE_LABELS,
  YearsOfExperienceEnum,
} from '@tutorix/shared-utils';
import { analytics } from '../../../lib/analytics';

type StudentTutorPreviewScreenProps = {
  tutorId: string;
  offeringId: string;
};

export const StudentTutorPreviewScreen: React.FC<StudentTutorPreviewScreenProps> = ({
  tutorId,
  offeringId,
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

  const years =
    YEARS_OF_EXPERIENCE_LABELS[detail.yearsOfExperience as YearsOfExperienceEnum] ?? '';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {detail.photoUrl ? (
          <Image source={{ uri: detail.photoUrl }} style={styles.photo} />
        ) : null}
        <Text style={styles.name}>{detail.displayName}</Text>
        {years ? <Text style={styles.meta}>{years}</Text> : null}
        <Text style={styles.meta}>
          {[detail.city, detail.distanceKm != null ? `${detail.distanceKm.toFixed(1)} km` : null]
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
      </View>
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
  photo: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: '700', color: '#143055' },
  section: { fontSize: 16, fontWeight: '700', color: '#143055', marginBottom: 8 },
  meta: { marginTop: 6, color: '#6b7280', fontSize: 14 },
  available: { marginTop: 8, color: '#16a34a', fontWeight: '700' },
  hint: { padding: 24, color: '#6b7280', textAlign: 'center' },
});
