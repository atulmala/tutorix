import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { SEARCH_TUTORS } from '@tutorix/shared-graphql/queries';
import { analytics } from '../../../lib/analytics';
import {
  readStudentTutorSearchDraft,
  writeStudentTutorSearchDraft,
} from './student-tutor-search-draft';
import type { StudentTutorSearchParams } from './student-tutor-search-params';
import {
  TutorSearchResultCard,
  type TutorSearchResultCardHit,
} from './TutorSearchResultCard';

type StudentTutorSearchResultsScreenProps = {
  searchParams: StudentTutorSearchParams;
  onOpenTutorPreview: (tutorId: string, offeringId: string) => void;
  onRefineSearch: (params: StudentTutorSearchParams) => void;
};

export const StudentTutorSearchResultsScreen: React.FC<
  StudentTutorSearchResultsScreenProps
> = ({ searchParams, onOpenTutorPreview, onRefineSearch }) => {
  const { data: searchData, loading } = useQuery(SEARCH_TUTORS, {
    variables: { input: searchParams },
    fetchPolicy: 'network-only',
  });
  const connection = searchData?.searchTutors;
  const hits = (connection?.items ?? []) as TutorSearchResultCardHit[];

  useEffect(() => {
    if (!connection) return;
    analytics.trackTutorSearch(
      searchParams.offeringId,
      {
        deliveryMode: searchParams.deliveryMode,
        classFormat: searchParams.classFormat,
        radiusKm: searchParams.radiusKm,
      },
      hits.length,
    );
  }, [connection, hits.length, searchParams]);

  const includeOnlineTutors = () => {
    const next = { ...searchParams, deliveryMode: 'ANY' as const };
    const draft = readStudentTutorSearchDraft();
    if (draft) {
      writeStudentTutorSearchDraft({ ...draft, deliveryMode: 'ANY' });
    }
    onRefineSearch(next);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {connection?.forcedOnlineOnly ? (
        <Text style={styles.hint}>
          Add a mapped home address to search nearby offline tutors. Showing online matches.
        </Text>
      ) : null}

      {loading ? (
        <Text style={styles.hint}>Finding tutors…</Text>
      ) : hits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.hint}>No tutors match these filters yet.</Text>
          {searchParams.deliveryMode === 'OFFLINE' ? (
            <Pressable
              onPress={includeOnlineTutors}
              accessibilityRole="button"
              accessibilityLabel="Include online tutors"
            >
              <Text style={styles.link}>Include online tutors</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          <Text style={styles.summary}>
            {hits.length} certified tutor{hits.length === 1 ? '' : 's'}
            {connection?.forcedOnlineOnly ? ' · online' : ''}
          </Text>
          {hits.map((hit) => (
            <TutorSearchResultCard
              key={String(hit.tutorId)}
              hit={{
                ...hit,
                tutorId: String(hit.tutorId),
                matchingOfferingId: String(hit.matchingOfferingId),
              }}
              onView={() => {
                analytics.trackTutorViewed(String(hit.tutorId));
                onOpenTutorPreview(String(hit.tutorId), String(hit.matchingOfferingId));
              }}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingBottom: 48 },
  hint: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginTop: 8 },
  link: { color: '#4a97f5', fontWeight: '700', marginTop: 8 },
  empty: { padding: 24, alignItems: 'center' },
  summary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#143055',
    marginBottom: 12,
  },
});
