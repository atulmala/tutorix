import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { TUTOR_BOOKED_CLASS_SESSIONS } from '@tutorix/shared-graphql/queries';
import {
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
  scheduledClassHasEnded,
} from '@tutorix/shared-utils/student-booking';
import { istBookedClassQueryRange } from '@tutorix/shared-utils/student-schedule';

type BookedClass = {
  enrollmentId: string;
  startsAt: string;
  durationMinutes: number;
  offeringLabel: string;
  studentName: string;
  isDemo: boolean;
  postClassRefundClaimId?: number | null;
  postClassRefundClaimPendingTutorAction?: boolean;
};

type Props = {
  onActOnRefundClaim?: (claimId: number) => void;
};

export const TutorConcludedClassesScreen: React.FC<Props> = ({ onActOnRefundClaim }) => {
  const scheduleRange = useMemo(() => istBookedClassQueryRange(), []);
  const { data, loading } = useQuery(TUTOR_BOOKED_CLASS_SESSIONS, {
    variables: {
      from: scheduleRange.from.toISOString(),
      to: scheduleRange.to.toISOString(),
    },
    fetchPolicy: 'network-only',
  });
  const rows = ((data?.tutorBookedClassSessions ?? []) as BookedClass[])
    .filter((row) => scheduledClassHasEnded(row.startsAt, row.durationMinutes))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {loading && rows.length === 0 ? (
        <Text style={styles.empty}>Loading classes…</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>No concluded classes yet.</Text>
      ) : (
        rows.map((row) => (
          <View key={row.enrollmentId} style={styles.row}>
            <Text style={styles.date}>{formatIstBookingDateLabel(new Date(row.startsAt))}</Text>
            <Text style={styles.time}>
              {formatIstBookingTimeRange(new Date(row.startsAt), row.durationMinutes)}
            </Text>
            <Text style={styles.subject}>
              {row.offeringLabel}
              {row.isDemo ? ' · Free demo' : ''}
            </Text>
            <Text style={styles.person}>Student · {row.studentName}</Text>
            {row.postClassRefundClaimId ? (
              <Text style={styles.claimBadge}>
                {row.postClassRefundClaimPendingTutorAction
                  ? 'Refund claim — your response needed'
                  : 'Refund claim raised'}
              </Text>
            ) : null}
            {row.postClassRefundClaimPendingTutorAction &&
            row.postClassRefundClaimId &&
            onActOnRefundClaim ? (
              <Pressable
                style={styles.respondButton}
                onPress={() => onActOnRefundClaim(row.postClassRefundClaimId!)}
                accessibilityRole="button"
                accessibilityLabel="Respond to refund claim"
              >
                <Text style={styles.respondButtonText}>Respond to claim</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#e8f4ff' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 10 },
  empty: { fontSize: 14, lineHeight: 20, color: '#64748b' },
  row: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  date: { fontSize: 14, fontWeight: '800', color: '#143055' },
  time: { marginTop: 2, fontSize: 14, color: '#143055' },
  subject: { marginTop: 6, fontSize: 14, color: '#143055' },
  person: { marginTop: 2, fontSize: 13, color: '#64748b' },
  claimBadge: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#92400e',
  },
  respondButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#d97706',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  respondButtonText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});
