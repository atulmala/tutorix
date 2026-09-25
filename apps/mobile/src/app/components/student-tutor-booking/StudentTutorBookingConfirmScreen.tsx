import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { BOOK_TUTOR_CLASS } from '@tutorix/shared-graphql/mutations';
import { MY_WALLET, TUTOR_SEARCH_DETAIL } from '@tutorix/shared-graphql/queries';
import { formatInr } from '@tutorix/shared-utils/rate-card';
import {
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
  type StudentBookingDraft,
} from '@tutorix/shared-utils/student-booking';
import { SLOT_DURATION_MINUTES } from '@tutorix/shared-utils/tutor-calendar';

type StudentTutorBookingConfirmScreenProps = {
  draft: Required<StudentBookingDraft>;
  onBooked: () => void;
  onOpenWallet: () => void;
};

export const StudentTutorBookingConfirmScreen: React.FC<
  StudentTutorBookingConfirmScreenProps
> = ({ draft, onBooked, onOpenWallet }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: detailData, loading: detailLoading, error: detailError } = useQuery(
    TUTOR_SEARCH_DETAIL,
    {
      variables: { tutorId: draft.tutorId, offeringId: draft.offeringId },
      fetchPolicy: 'network-only',
    },
  );
  const { data: walletData, loading: walletLoading } = useQuery(MY_WALLET, {
    fetchPolicy: 'network-only',
  });
  const [bookClass, { loading: booking }] = useMutation(BOOK_TUTOR_CLASS);

  const detail = detailData?.tutorSearchDetail;
  const offering = detail?.matchingOffering;
  const price =
    draft.deliveryMode === 'online'
      ? offering?.onlineRateInr
      : offering?.offlineRateInr;
  const balance = walletData?.myWallet?.balanceInr ?? 0;
  const startsAt = new Date(draft.startsAt);
  const canPay = typeof price === 'number' && balance >= price;

  if (detailLoading || walletLoading) {
    return <Text style={styles.hint}>Loading booking…</Text>;
  }
  if (detailError || !detail || !offering || typeof price !== 'number') {
    return <Text style={styles.hint}>Could not load this booking.</Text>;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Confirm class</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{detail.displayName}</Text>
        <Text style={styles.meta}>{offering.offeringLabel}</Text>
        <Text style={styles.meta}>
          {draft.deliveryMode === 'online' ? 'Online' : 'Offline'}
        </Text>
        <Text style={styles.meta}>{formatIstBookingDateLabel(startsAt)}</Text>
        <Text style={styles.meta}>{formatIstBookingTimeRange(startsAt)}</Text>
        <Text style={styles.meta}>
          {SLOT_DURATION_MINUTES === 60 ? '1 hour' : `${SLOT_DURATION_MINUTES} min`}
        </Text>
        <Text style={styles.price}>{formatInr(price)}</Text>
        <Text style={styles.meta}>Wallet balance {formatInr(balance)}</Text>
      </View>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {canPay ? (
        <Pressable
          style={styles.button}
          disabled={booking}
          onPress={() => {
            setErrorMessage(null);
            void bookClass({
              variables: {
                tutorCalendarId: draft.tutorCalendarId,
                offeringId: draft.offeringId,
                deliveryMode: draft.deliveryMode,
              },
            })
              .then(() => onBooked())
              .catch((error: { message?: string }) => {
                setErrorMessage(error.message ?? 'Could not book this class.');
              });
          }}
          accessibilityRole="button"
          accessibilityLabel={`Pay ${formatInr(price)}`}
        >
          <Text style={styles.buttonText}>
            {booking ? 'Booking…' : `Pay ${formatInr(price)}`}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.button}
          onPress={onOpenWallet}
          accessibilityRole="button"
          accessibilityLabel="Add money to wallet"
        >
          <Text style={styles.buttonText}>Add money to wallet</Text>
        </Pressable>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#e8f4ff' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#143055' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 6,
  },
  name: { fontSize: 18, fontWeight: '800', color: '#143055' },
  meta: { color: '#6b7280', fontSize: 14 },
  price: { fontSize: 18, fontWeight: '800', color: '#143055', marginTop: 6 },
  error: { color: '#dc2626', fontSize: 14 },
  hint: { padding: 24, color: '#6b7280', textAlign: 'center' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
