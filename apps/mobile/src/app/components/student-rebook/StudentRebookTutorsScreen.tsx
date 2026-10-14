import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { STUDENT_REBOOK_TUTORS } from '@tutorix/shared-graphql/queries';
import { TutorSearchResultCard } from '../student-tutor-search/TutorSearchResultCard';

type RebookTutorRow = {
  tutorId: number;
  catalogOfferingId: number;
  displayName: string;
  photoUrl?: string | null;
  offeringLabel: string;
  totalClassCount: number;
  lastDeliveryMode: string;
  totalExperienceMonths?: number | null;
};

type StudentRebookTutorsScreenProps = {
  onOpenTutorPreview: (tutorId: string, offeringId: string) => void;
  onFindTutor: () => void;
};

function deliveryModeLabel(mode: string): string {
  return String(mode).toLowerCase() === 'offline' ? 'Offline' : 'Online';
}

export const StudentRebookTutorsScreen: React.FC<StudentRebookTutorsScreenProps> = ({
  onOpenTutorPreview,
  onFindTutor,
}) => {
  const { data, loading } = useQuery(STUDENT_REBOOK_TUTORS, {
    fetchPolicy: 'cache-and-network',
  });
  const tutors = (data?.studentRebookTutors ?? []) as RebookTutorRow[];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {loading && tutors.length === 0 ? (
        <Text style={styles.hint}>Loading your tutors…</Text>
      ) : tutors.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No tutors to re-book yet</Text>
          <Text style={styles.hint}>
            After you book paid classes with a tutor, they will appear here for quick re-booking.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={onFindTutor}
            accessibilityRole="button"
            accessibilityLabel="Find a tutor"
          >
            <Text style={styles.primaryButtonText}>Find a tutor</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.summary}>
            {tutors.length} tutor{tutors.length === 1 ? '' : 's'} you have booked before
          </Text>
          {tutors.map((row) => (
            <TutorSearchResultCard
              key={`${row.tutorId}-${row.catalogOfferingId}`}
              hit={{
                tutorId: String(row.tutorId),
                displayName: row.displayName,
                photoUrl: row.photoUrl,
                totalExperienceMonths: row.totalExperienceMonths ?? undefined,
                offeringLabel: row.offeringLabel,
                matchingOfferingId: String(row.catalogOfferingId),
                rateInr: 0,
                deliveryModeShown: row.lastDeliveryMode,
                freeDemoOffered: false,
                hasAvailabilityThisWeek: false,
                groupSize: 1,
              }}
              bookedClassCount={row.totalClassCount}
              deliveryModeLabel={deliveryModeLabel(row.lastDeliveryMode)}
              onView={() =>
                onOpenTutorPreview(String(row.tutorId), String(row.catalogOfferingId))
              }
            />
          ))}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#e8f4ff' },
  content: { padding: 16, paddingBottom: 32 },
  summary: { color: '#6b7280', marginBottom: 12, fontSize: 14 },
  hint: { color: '#6b7280', fontSize: 14, lineHeight: 20 },
  empty: { gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#143055' },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#4a97f5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
