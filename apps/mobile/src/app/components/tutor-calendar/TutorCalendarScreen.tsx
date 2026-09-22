import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_DETAIL } from '@tutorix/shared-graphql/queries';
import type { TutorDetailRecord } from '@tutorix/tutor-detail-ui';
import { TutorAvailabilitySection } from '../tutor-profile/TutorAvailabilitySection';

type MyTutorDetailData = {
  myTutorDetail?: TutorDetailRecord | null;
};

type TutorCalendarScreenProps = {
  onSetupComplete?: () => void;
};

export const TutorCalendarScreen: React.FC<TutorCalendarScreenProps> = ({
  onSetupComplete,
}) => {
  const { data, loading, error } = useQuery<MyTutorDetailData>(GET_MY_TUTOR_DETAIL, {
    fetchPolicy: 'cache-and-network',
  });
  const tutor = data?.myTutorDetail;

  if (loading && !tutor) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error || !tutor) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Could not load your calendar.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {!tutor.availabilityConfiguredAt ? (
        <Text style={styles.setupHint}>
          Set your usual weekly hours once. We apply them to all upcoming weeks; you can change
          them anytime.
        </Text>
      ) : null}
      <TutorAvailabilitySection
        tutor={tutor}
        bankDetailsComplete={Boolean(tutor.user?.bankDetails?.isComplete)}
        onOpenRateCard={() => undefined}
        mode="editor"
        onSaved={onSetupComplete}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#e8f4ff' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f4ff' },
  error: { color: '#b91c1c', fontSize: 14 },
  setupHint: { fontSize: 14, color: '#475569', marginBottom: 12, lineHeight: 20 },
});
