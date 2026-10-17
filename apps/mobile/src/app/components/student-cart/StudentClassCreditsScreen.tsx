import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { MY_CLASS_CREDITS } from '@tutorix/shared-graphql/queries';
import {
  canChangeScheduledClass,
  formatIstBookingDateLabel,
} from '@tutorix/shared-utils/student-booking';
import { groupUnscheduledClassCredits } from '@tutorix/shared-utils/student-class-credit-groups';

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
  refundableInr?: number;
  isDemo?: boolean;
};

function canChangeScheduledCredit(credit: StudentClassCredit): boolean {
  return (
    credit.status === 'scheduled' &&
    canChangeScheduledClass(credit.startsAt, credit.deliveryMode)
  );
}

type StudentClassCreditsScreenProps = {
  onSchedule: (credits: StudentClassCredit[]) => void;
  onScheduleLater: () => void;
};

export const StudentClassCreditsScreen: React.FC<StudentClassCreditsScreenProps> = ({
  onSchedule,
  onScheduleLater,
}) => {
  const { data, loading, error } = useQuery(MY_CLASS_CREDITS, {
    fetchPolicy: 'network-only',
  });
  const credits = (data?.myClassCredits ?? []) as StudentClassCredit[];
  const unscheduled = credits.filter((row) => row.status === 'unscheduled');
  const unscheduledGroups = groupUnscheduledClassCredits(unscheduled);
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
          {unscheduledGroups.map((group) => {
            const credit = group.credits[0];
            const count = group.credits.length;
            const actionLabel = count === 1 ? 'Pick a slot' : 'Pick slots';
            return (
              <View key={group.key} style={styles.line}>
                <Text style={styles.lineTitle}>{credit.offeringLabel}</Text>
                {group.credits.some((row) => row.isDemo) ? (
                  <Text style={styles.demoChip}>Free demo</Text>
                ) : null}
                <Text style={styles.meta}>
                  {credit.deliveryMode === 'online' ? 'Online' : 'Offline'} · {credit.tutorName}
                </Text>
                <Text style={styles.lineTitle}>
                  {count} {count === 1 ? 'class' : 'classes'} to schedule
                </Text>
                <View style={styles.actions}>
                  <Pressable
                    style={styles.primary}
                    onPress={() => onSchedule(group.credits)}
                    accessibilityRole="button"
                    accessibilityLabel={actionLabel}
                  >
                    <Text style={styles.primaryText}>{actionLabel}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
      {scheduled.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.section}>Scheduled</Text>
          {scheduled.map((credit) => (
            <View key={credit.id} style={styles.line}>
              <Text style={styles.lineTitle}>{credit.offeringLabel}</Text>
              {credit.isDemo ? <Text style={styles.demoChip}>Free demo</Text> : null}
              <Text style={styles.meta}>
                {credit.deliveryMode === 'online' ? 'Online' : 'Offline'} · {credit.tutorName}
                {credit.startsAt
                  ? ` · ${formatIstBookingDateLabel(new Date(credit.startsAt))}`
                  : ''}
              </Text>
              <View style={styles.actions}>
                {canChangeScheduledCredit(credit) ? (
                  <Pressable onPress={() => onSchedule([credit])} accessibilityRole="button">
                    <Text style={styles.link}>Reschedule</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      <Pressable
        style={styles.later}
        onPress={onScheduleLater}
        accessibilityRole="button"
        accessibilityLabel="I will schedule later"
      >
        <Text style={styles.laterText}>I will schedule later</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#143055' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  section: { fontSize: 16, fontWeight: '800', color: '#143055' },
  line: { gap: 4 },
  lineTitle: { fontSize: 14, fontWeight: '700', color: '#143055' },
  meta: { fontSize: 13, color: '#64748b' },
  demoChip: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: 16, marginTop: 8, alignItems: 'center' },
  primary: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  link: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  later: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  laterText: { fontSize: 14, fontWeight: '700', color: '#143055' },
  hint: { fontSize: 14, color: '#64748b', paddingHorizontal: 20 },
});
