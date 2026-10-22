import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { UNSCHEDULE_CLASS_CREDIT } from '@tutorix/shared-graphql/mutations';
import { MY_CLASS_CREDITS } from '@tutorix/shared-graphql/queries';
import {
  canChangeScheduledClass,
  formatIstScheduledClassDateTime,
  scheduledClassHasEnded,
} from '@tutorix/shared-utils/student-booking';
import { tutorBookingModeLabel } from '@tutorix/shared-utils/tutor-booking-history';
import type { StudentClassCredit } from '../student-cart/StudentClassCreditsScreen';

export type BookingScheduledClassesContext = {
  orderItemId: number;
  tutorName: string;
  offeringLabel: string;
};

type StudentBookingScheduledClassesScreenProps = {
  booking: BookingScheduledClassesContext;
  onReschedule: (credit: StudentClassCredit) => void;
};

const DEFAULT_DURATION_MINUTES = 60;

export const StudentBookingScheduledClassesScreen: React.FC<
  StudentBookingScheduledClassesScreenProps
> = ({ booking, onReschedule }) => {
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyCreditId, setBusyCreditId] = useState<number | null>(null);

  const { data, loading, error, refetch } = useQuery(MY_CLASS_CREDITS, {
    fetchPolicy: 'network-only',
  });

  const [unscheduleClass] = useMutation(UNSCHEDULE_CLASS_CREDIT, {
    refetchQueries: ['StudentClassBookings', { query: MY_CLASS_CREDITS }],
  });

  const upcoming = useMemo(() => {
    const credits = (data?.myClassCredits ?? []) as StudentClassCredit[];
    return credits
      .filter(
        (row) =>
          row.orderItemId === booking.orderItemId &&
          row.status === 'scheduled' &&
          row.startsAt != null &&
          !scheduledClassHasEnded(row.startsAt, DEFAULT_DURATION_MINUTES),
      )
      .sort(
        (a, b) =>
          new Date(a.startsAt as string).getTime() - new Date(b.startsAt as string).getTime(),
      );
  }, [booking.orderItemId, data?.myClassCredits]);

  const confirmUnschedule = (credit: StudentClassCredit) => {
    setActionError(null);
    Alert.alert(
      'Unschedule class?',
      'This frees the tutor and your slot. The class moves back to unscheduled and you can pick a new time later.',
      [
        { text: 'Keep scheduled', style: 'cancel' },
        {
          text: 'Unschedule',
          style: 'destructive',
          onPress: () => {
            setBusyCreditId(credit.id);
            void unscheduleClass({ variables: { creditId: String(credit.id) } })
              .then(() => refetch())
              .catch((failure: unknown) => {
                setActionError(
                  failure instanceof Error ? failure.message : 'Could not unschedule this class.',
                );
              })
              .finally(() => setBusyCreditId(null));
          },
        },
      ],
    );
  };

  if (loading) {
    return <Text style={styles.message}>Loading scheduled classes…</Text>;
  }
  if (error) {
    return <Text style={styles.error}>Could not load scheduled classes.</Text>;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scheduled classes</Text>
      <Text style={styles.meta}>
        {booking.offeringLabel} · {booking.tutorName}
      </Text>
      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      {upcoming.length === 0 ? (
        <Text style={styles.message}>No upcoming scheduled classes on this booking.</Text>
      ) : (
        upcoming.map((credit) => {
          const startsAt = new Date(credit.startsAt as string);
          const canChange = canChangeScheduledClass(credit.startsAt, credit.deliveryMode);
          const busy = busyCreditId === credit.id;
          return (
            <View key={credit.id} style={styles.card}>
              <Text style={styles.time}>
                {formatIstScheduledClassDateTime(startsAt, DEFAULT_DURATION_MINUTES)}
              </Text>
              <Text style={styles.mode}>{tutorBookingModeLabel(credit.deliveryMode)}</Text>
              {canChange ? (
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => onReschedule(credit)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Reschedule class"
                    style={styles.actionLink}
                  >
                    <Text style={styles.actionReschedule}>Reschedule</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmUnschedule(credit)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Unschedule class"
                    style={styles.actionLink}
                  >
                    <Text style={styles.actionUnschedule}>
                      {busy ? 'Unscheduling…' : 'Unschedule'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.lockedHint}>Changes are no longer available</Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#e8f4ff' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#143055' },
  meta: { fontSize: 14, fontWeight: '700', color: '#475569' },
  message: { fontSize: 14, lineHeight: 20, color: '#64748b' },
  error: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  time: { fontSize: 16, fontWeight: '800', color: '#143055' },
  mode: { marginTop: 4, fontSize: 13, fontWeight: '600', color: '#64748b' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 10 },
  actionLink: { alignSelf: 'flex-start' },
  actionReschedule: { fontSize: 15, fontWeight: '800', color: '#2563eb' },
  actionUnschedule: { fontSize: 15, fontWeight: '800', color: '#dc2626' },
  lockedHint: { marginTop: 10, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
});
