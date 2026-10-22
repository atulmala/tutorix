import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLazyQuery, useMutation } from '@apollo/client';
import {
  CANCEL_CLASS_BOOKING,
  PREVIEW_CLASS_BOOKING_CANCELLATION,
} from '@tutorix/shared-graphql/mutations';

export type ClassCancellationBooking = {
  orderItemId: number;
  tutorName: string;
  offeringLabel: string;
  classCount: number;
  scheduledCount: number;
  unscheduledCount: number;
  concludedCount: number;
  cancelledCount: number;
  cancellableCount: number;
};

function BookingClassSummary({ booking }: { booking: ClassCancellationBooking }) {
  const rows: { label: string; value: number }[] = [
    { label: 'Total classes in this booking', value: booking.classCount },
    { label: 'Scheduled classes', value: booking.scheduledCount },
    { label: 'Unscheduled classes', value: booking.unscheduledCount },
    { label: 'Concluded classes', value: booking.concludedCount },
  ];
  if (booking.cancelledCount > 0) {
    rows.push({ label: 'Cancelled classes', value: booking.cancelledCount });
  }
  rows.push({
    label: 'Classes available for cancellation',
    value: booking.cancellableCount,
  });
  return (
    <View style={styles.summaryCard}>
      {rows.map((row) => (
        <View key={row.label} style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{row.label}</Text>
          <Text style={styles.summaryValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

type StudentClassCancellationScreenProps = {
  booking: ClassCancellationBooking;
  onComplete: () => void;
  onBack: () => void;
};

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export const StudentClassCancellationScreen: React.FC<StudentClassCancellationScreenProps> = ({
  booking,
  onComplete,
  onBack,
}) => {
  const [cancelCount, setCancelCount] = useState('1');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const [loadPreview, { data: previewData, loading: previewLoading }] = useLazyQuery(
    PREVIEW_CLASS_BOOKING_CANCELLATION,
    { fetchPolicy: 'network-only' },
  );

  const [cancelBooking, { loading: cancelling }] = useMutation(CANCEL_CLASS_BOOKING, {
    refetchQueries: ['StudentClassBookings'],
  });

  const preview = previewData?.previewClassBookingCancellation;

  const displayBooking = useMemo(
    () => ({
      ...booking,
      cancellableCount: preview?.cancellableCount ?? booking.cancellableCount,
    }),
    [booking, preview?.cancellableCount],
  );

  const parsedCancelCount =
    cancelCount.trim() === '' ? 0 : Math.floor(Number(cancelCount)) || 0;
  const canCancelAny = displayBooking.cancellableCount > 0;
  const canSubmitCancel =
    parsedCancelCount > 0 && parsedCancelCount <= displayBooking.cancellableCount;

  useEffect(() => {
    if (!canCancelAny || !canSubmitCancel) {
      return;
    }
    void loadPreview({
      variables: {
        orderItemId: String(booking.orderItemId),
        cancelCount: parsedCancelCount,
      },
    });
  }, [
    booking.orderItemId,
    parsedCancelCount,
    canCancelAny,
    canSubmitCancel,
    loadPreview,
  ]);

  const refundInr = canSubmitCancel ? preview?.refundInr ?? 0 : 0;
  const breakdownText = canSubmitCancel ? preview?.breakdown?.breakdownText ?? '' : '';

  const confirmCancel = (refundMethod: 'wallet' | 'gateway') => {
    if (!canSubmitCancel) {
      return;
    }
    setCancelError(null);
    void cancelBooking({
      variables: {
        orderItemId: String(booking.orderItemId),
        cancelCount: parsedCancelCount,
        refundMethod,
      },
    })
      .then((result) => {
        const amount = result.data?.cancelClassBooking?.amountInr ?? refundInr;
        if (refundMethod === 'wallet') {
          setSuccessMessage(
            `Your classes were cancelled and a refund of ${formatInr(amount)} has been initiated. It will be credited to your wallet after processing.`,
          );
        } else {
          setSuccessMessage(
            `Your classes were cancelled and a cash refund of ${formatInr(amount)} has been initiated. It will be processed within 2 working days.`,
          );
        }
      })
      .catch((failure: unknown) => {
        setCancelError(
          failure instanceof Error ? failure.message : 'Could not cancel these classes.',
        );
      });
  };

  if (successMessage) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Cancellation confirmed</Text>
        <Text style={styles.subtitle}>{successMessage}</Text>
        <Text style={styles.hint}>We will email you when your refund is complete.</Text>
        <Pressable onPress={onComplete} style={styles.primaryButton} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>Done</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
      <Text style={styles.title}>Class cancellation</Text>
      <Text style={styles.meta}>{booking.offeringLabel} · {booking.tutorName}</Text>

      <BookingClassSummary booking={displayBooking} />

      {!canCancelAny ? (
        <Text style={styles.subtitle}>
          No classes on this booking can be cancelled right now.
        </Text>
      ) : null}

      {canCancelAny ? (
        <>
      <Text style={styles.label}>Number of classes to cancel</Text>
      <TextInput
        value={cancelCount}
        onChangeText={setCancelCount}
        keyboardType="number-pad"
        style={styles.input}
        accessibilityLabel="Number of classes to cancel"
        onFocus={() => {
          requestAnimationFrame(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
          });
        }}
      />

      <View style={styles.refundRow}>
        <Text style={styles.refund}>
          Refundable amount:{' '}
          {canSubmitCancel && previewLoading ? '…' : formatInr(refundInr)}
        </Text>
        {breakdownText ? (
          <Pressable
            onPress={() => setBreakdownOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="How refund is calculated"
            style={styles.infoButton}
          >
            <Text style={styles.infoButtonText}>i</Text>
          </Pressable>
        ) : null}
      </View>

      {cancelError ? <Text style={styles.error}>{cancelError}</Text> : null}

      <Pressable
        onPress={() => confirmCancel('wallet')}
        disabled={cancelling || !canSubmitCancel || previewLoading}
        style={[
          styles.primaryButton,
          (cancelling || !canSubmitCancel || previewLoading) && styles.disabled,
        ]}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>
          {cancelling ? 'Cancelling…' : `Cancel and refund ${formatInr(refundInr)} to wallet`}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => confirmCancel('gateway')}
        disabled={cancelling || !canSubmitCancel || previewLoading}
        style={[
          styles.secondaryButton,
          (cancelling || !canSubmitCancel || previewLoading) && styles.disabled,
        ]}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryButtonText}>Cash refund {formatInr(refundInr)}</Text>
      </Pressable>

      <Text style={styles.hint}>
        Cash refunds are initiated immediately and credited to your payment method within 2 working
        days after processing.
      </Text>
        </>
      ) : null}

      <Pressable
        onPress={onBack}
        disabled={cancelling}
        style={[styles.tertiaryButton, cancelling && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel="Do not Cancel"
      >
        <Text style={styles.tertiaryButtonText}>Do not Cancel</Text>
      </Pressable>

      <Modal visible={breakdownOpen} transparent animationType="fade" onRequestClose={() => setBreakdownOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Refund calculation</Text>
            <Text style={styles.modalBody}>{breakdownText}</Text>
            <Pressable onPress={() => setBreakdownOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 10,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#143055' },
  subtitle: { fontSize: 14, color: '#475569' },
  meta: { fontSize: 14, fontWeight: '700', color: '#143055' },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 14,
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  summaryLabel: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 20 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#143055' },
  label: { fontSize: 14, fontWeight: '600', color: '#143055', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    maxWidth: 120,
    backgroundColor: '#fff',
  },
  refundRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  refund: { fontSize: 14, fontWeight: '700', color: '#143055' },
  infoButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  error: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#2563eb', fontWeight: '700', fontSize: 15 },
  tertiaryButton: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tertiaryButtonText: { color: '#475569', fontWeight: '700', fontSize: 15 },
  hint: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  disabled: { opacity: 0.5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 39, 68, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#143055', marginBottom: 8 },
  modalBody: { fontSize: 13, lineHeight: 20, color: '#475569' },
  modalClose: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  modalCloseText: { fontSize: 16, fontWeight: '700', color: '#64748b' },
});
