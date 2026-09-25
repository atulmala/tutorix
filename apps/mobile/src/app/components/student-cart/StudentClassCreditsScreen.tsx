import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { MY_CLASS_CREDITS } from '@tutorix/shared-graphql/queries';
import { formatIstBookingDateLabel } from '@tutorix/shared-utils/student-booking';

export type StudentClassCredit = {
  id: number;
  tutorId: number;
  offeringId: number;
  tutorOfferingId: number;
  tutorName: string;
  offeringLabel: string;
  deliveryMode: 'online' | 'offline';
  status: 'unscheduled' | 'scheduled' | 'cancelled';
  enrollmentId?: number | null;
  startsAt?: string | Date | null;
};

type StudentClassCreditsScreenProps = {
  onSchedule: (credit: StudentClassCredit) => void;
};

export const StudentClassCreditsScreen: React.FC<StudentClassCreditsScreenProps> = ({
  onSchedule,
}) => {
  const { data, loading, error } = useQuery(MY_CLASS_CREDITS, {
    fetchPolicy: 'network-only',
  });
  const credits = (data?.myClassCredits ?? []) as StudentClassCredit[];
  const unscheduled = credits.filter((row) => row.status === 'unscheduled');
  const scheduled = credits.filter((row) => row.status === 'scheduled');

  if (loading) {
    return <Text style={styles.hint}>Loading classes…</Text>;
  }
  if (error) {
    return <Text style={styles.hint}>Could not load your classes.</Text>;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Schedule classes</Text>
      {unscheduled.length === 0 && scheduled.length === 0 ? (
        <Text style={styles.meta}>You have no purchased classes to schedule.</Text>
      ) : null}
      {unscheduled.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.section}>
            {unscheduled.length} {unscheduled.length === 1 ? 'class' : 'classes'} to schedule
          </Text>
          {unscheduled.map((credit) => (
            <View key={credit.id} style={styles.line}>
              <Text style={styles.lineTitle}>{credit.offeringLabel}</Text>
              <Text style={styles.meta}>
                {credit.deliveryMode === 'online' ? 'Online' : 'Offline'} · {credit.tutorName}
              </Text>
              <Pressable
                style={styles.primary}
                onPress={() => onSchedule(credit)}
                accessibilityRole="button"
                accessibilityLabel="Pick a slot"
              >
                <Text style={styles.primaryText}>Pick a slot</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {scheduled.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.section}>Scheduled</Text>
          {scheduled.map((credit) => (
            <View key={credit.id} style={styles.line}>
              <Text style={styles.lineTitle}>{credit.offeringLabel}</Text>
              <Text style={styles.meta}>
                {credit.deliveryMode === 'online' ? 'Online' : 'Offline'} · {credit.tutorName}
                {credit.startsAt
                  ? ` · ${formatIstBookingDateLabel(new Date(credit.startsAt))}`
                  : ''}
              </Text>
              <Pressable onPress={() => onSchedule(credit)} accessibilityRole="button">
                <Text style={styles.link}>Reschedule</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', color: '#143055' },
  section: { fontSize: 16, fontWeight: '800', color: '#143055', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 10 },
  line: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 12, gap: 6 },
  lineTitle: { fontSize: 14, fontWeight: '800', color: '#143055' },
  meta: { color: '#64748b', fontSize: 13 },
  primary: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  link: { color: '#2563eb', fontWeight: '700' },
  hint: { padding: 24, color: '#6b7280', textAlign: 'center' },
});
