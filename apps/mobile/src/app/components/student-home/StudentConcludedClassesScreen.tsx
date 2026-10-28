import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { STUDENT_BOOKED_CLASS_SESSIONS } from '@tutorix/shared-graphql/queries';
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
  tutorName: string;
  postClassRefundClaimEligible?: boolean;
  postClassRefundClaimStudentStatus?: string | null;
};

function statusLabel(status: string | null | undefined): string | null {
  switch (status) {
    case 'under_process':
      return 'Under process';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'settled':
      return 'Settled';
    default:
      return null;
  }
}

type Props = {
  onClaimRefund?: (enrollmentId: string) => void;
};

export const StudentConcludedClassesScreen: React.FC<Props> = ({ onClaimRefund }) => {
  const scheduleRange = useMemo(() => istBookedClassQueryRange(), []);
  const { data, loading } = useQuery(STUDENT_BOOKED_CLASS_SESSIONS, {
    variables: {
      from: scheduleRange.from.toISOString(),
      to: scheduleRange.to.toISOString(),
    },
    fetchPolicy: 'network-only',
  });
  const rows = ((data?.studentBookedClassSessions ?? []) as BookedClass[])
    .filter((row) => scheduledClassHasEnded(row.startsAt, row.durationMinutes))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {loading && rows.length === 0 ? (
        <Text style={styles.empty}>Loading classes…</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>No concluded classes yet.</Text>
      ) : (
        rows.map((row) => {
          const label = statusLabel(row.postClassRefundClaimStudentStatus);
          return (
            <View key={row.enrollmentId} style={styles.row}>
              <Text style={styles.date}>{formatIstBookingDateLabel(new Date(row.startsAt))}</Text>
              <Text style={styles.time}>
                {formatIstBookingTimeRange(new Date(row.startsAt), row.durationMinutes)}
              </Text>
              <Text style={styles.subject}>{row.offeringLabel}</Text>
              <Text style={styles.person}>Tutor · {row.tutorName}</Text>
              {label ? (
                <Text style={styles.status}>Refund claim: {label}</Text>
              ) : row.postClassRefundClaimEligible && onClaimRefund ? (
                <TouchableOpacity
                  style={styles.claimBtn}
                  onPress={() => onClaimRefund(row.enrollmentId)}
                >
                  <Text style={styles.claimBtnText}>Claim refund</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })
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
  status: { marginTop: 8, fontSize: 11, fontWeight: '800', color: '#92400e' },
  claimBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#143055',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  claimBtnText: { fontSize: 12, fontWeight: '800', color: '#143055' },
});
