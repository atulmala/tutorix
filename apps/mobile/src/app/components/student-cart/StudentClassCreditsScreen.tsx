import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { CANCEL_CLASS_CREDITS } from '@tutorix/shared-graphql/mutations';
import { MY_CLASS_CREDITS, MY_WALLET } from '@tutorix/shared-graphql/queries';
import { formatIstBookingDateLabel } from '@tutorix/shared-utils/student-booking';
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

function canCancelCredit(credit: StudentClassCredit): boolean {
  if (credit.status === 'unscheduled') {
    return true;
  }
  if (credit.status !== 'scheduled' || !credit.startsAt) {
    return false;
  }
  return new Date(credit.startsAt).getTime() > Date.now();
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

type StudentClassCreditsScreenProps = {
  onSchedule: (credits: StudentClassCredit[]) => void;
};

export const StudentClassCreditsScreen: React.FC<StudentClassCreditsScreenProps> = ({
  onSchedule,
}) => {
  const [pending, setPending] = useState<StudentClassCredit[] | null>(null);
  const [cancelCountText, setCancelCountText] = useState('1');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelCredits, { loading: cancelling }] = useMutation(CANCEL_CLASS_CREDITS, {
    refetchQueries: [{ query: MY_CLASS_CREDITS }, { query: MY_WALLET }],
    update: (cache, { data }) => {
      const balance = data?.cancelClassCredits?.walletBalanceInr;
      if (typeof balance !== 'number') {
        return;
      }
      cache.writeQuery({
        query: MY_WALLET,
        data: {
          myWallet: {
            __typename: 'UserWalletDto',
            balanceInr: balance,
          },
        },
      });
    },
  });
  const { data, loading, error } = useQuery(MY_CLASS_CREDITS, {
    fetchPolicy: 'network-only',
  });
  const credits = (data?.myClassCredits ?? []) as StudentClassCredit[];
  const unscheduled = credits.filter((row) => row.status === 'unscheduled');
  const unscheduledGroups = groupUnscheduledClassCredits(unscheduled);
  const scheduled = credits.filter((row) => row.status === 'scheduled');

  const openCancel = (credits: StudentClassCredit[]) => {
    setPending(credits);
    setCancelCountText(String(credits.length));
    setCancelError(null);
  };
  const cancelCount = (() => {
    if (!/^\d+$/.test(cancelCountText)) {
      return 0;
    }
    const next = Number(cancelCountText);
    const max = pending?.length ?? 0;
    if (next < 1 || max < 1) {
      return 0;
    }
    return Math.min(max, next);
  })();
  const selected = pending?.slice(0, cancelCount) ?? [];
  const refundAmount = selected.reduce((sum, credit) => sum + (credit.refundableInr ?? 0), 0);
  const confirmCancel = (refundMethod: 'wallet' | 'gateway') => {
    if (selected.length === 0) {
      setCancelError('Enter how many classes to cancel.');
      return;
    }
    setCancelError(null);
    void cancelCredits({
      variables: {
        creditIds: selected.map((credit) => String(credit.id)),
        refundMethod,
      },
    })
      .then(() => setPending(null))
      .catch((cancelFailure: unknown) => {
        setCancelError(
          cancelFailure instanceof Error
            ? cancelFailure.message
            : 'Could not cancel these classes.',
        );
      });
  };

  if (loading) {
    return <Text style={styles.hint}>Loading classes…</Text>;
  }
  if (error) {
    return <Text style={styles.hint}>Could not load your classes.</Text>;
  }

  return (
    <>
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
                  <Pressable
                    onPress={() => openCancel(group.credits)}
                    accessibilityRole="button"
                    accessibilityLabel={count === 1 ? 'Cancel' : 'Cancel classes'}
                  >
                    <Text style={styles.cancel}>{count === 1 ? 'Cancel' : 'Cancel classes'}</Text>
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
                <Pressable onPress={() => onSchedule([credit])} accessibilityRole="button">
                  <Text style={styles.link}>Reschedule</Text>
                </Pressable>
                {canCancelCredit(credit) ? (
                  <Pressable
                    onPress={() => openCancel([credit])}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text style={styles.cancel}>Cancel</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
      <Modal
        visible={pending != null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!cancelling) {
            setPending(null);
          }
        }}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => {
            if (!cancelling) {
              setPending(null);
            }
          }}
        >
          <Pressable style={styles.dialog} onPress={() => undefined}>
            <Text style={styles.section}>Cancel classes</Text>
            <Text style={styles.meta}>
              {pending?.[0]?.offeringLabel} · {pending?.[0]?.tutorName}
            </Text>
            {pending && pending.length > 1 ? (
              <View>
                <Text style={styles.fieldLabel}>Classes to cancel</Text>
                <TextInput
                  value={cancelCountText}
                  keyboardType="number-pad"
                  onChangeText={(value) => {
                    const digits = value.replace(/\D/g, '');
                    if (digits === '') {
                      setCancelCountText('');
                      return;
                    }
                    const next = Number(digits);
                    setCancelCountText(
                      String(next > pending.length ? pending.length : next),
                    );
                  }}
                  accessibilityLabel="Classes to cancel"
                  style={styles.countInput}
                />
              </View>
            ) : null}
            <Text style={styles.lineTitle}>Refund {formatInr(refundAmount)}</Text>
            {cancelError ? <Text style={styles.error}>{cancelError}</Text> : null}
            <Pressable
              style={styles.primary}
              disabled={cancelling}
              onPress={() => confirmCancel('wallet')}
              accessibilityRole="button"
              accessibilityLabel={`Add ${formatInr(refundAmount)} to wallet`}
            >
              <Text style={styles.primaryText}>
                {cancelling ? 'Cancelling…' : `Add ${formatInr(refundAmount)} to wallet`}
              </Text>
            </Pressable>
            <Pressable
              disabled={cancelling}
              onPress={() => confirmCancel('gateway')}
              accessibilityRole="button"
              accessibilityLabel={`Refund ${formatInr(refundAmount)} to your payment method`}
            >
              <Text style={styles.link}>
                Refund {formatInr(refundAmount)} to your payment method
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => setPending(null)}
              accessibilityRole="button"
              accessibilityLabel="Keep these classes"
            >
              <Text style={styles.secondaryText}>Keep these classes</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
  demoChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#d1fae5',
    color: '#065f46',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  meta: { color: '#64748b', fontSize: 13 },
  primary: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
  link: { color: '#2563eb', fontWeight: '700' },
  cancel: { color: '#b91c1c', fontWeight: '700' },
  error: { color: '#dc2626', fontSize: 13 },
  fieldLabel: {
    color: '#143055',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  countInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 88,
    color: '#143055',
    fontSize: 16,
  },
  secondary: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryText: { color: '#143055', fontWeight: '700' },
  hint: { padding: 24, color: '#6b7280', textAlign: 'center' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
});
