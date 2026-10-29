import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLazyQuery, useMutation } from '@apollo/client';
import { PREVIEW_POST_CLASS_REFUND_CLAIM } from '@tutorix/shared-graphql/queries';
import { SUBMIT_POST_CLASS_REFUND_CLAIM } from '@tutorix/shared-graphql/mutations';

const REASONS = [
  { value: 'class_did_not_take_place', label: 'Class did not take place' },
  { value: 'technical_issue', label: 'Technical issue (video, sound, or whiteboard)' },
  { value: 'not_satisfied', label: 'Not satisfied with class quality / duration too short' },
] as const;

type RefundReason = (typeof REASONS)[number]['value'];

type Props = {
  enrollmentId: string;
  onComplete: () => void;
  onBack: () => void;
};

export const StudentPostClassRefundClaimScreen: React.FC<Props> = ({
  enrollmentId,
  onComplete,
  onBack,
}) => {
  const [reason, setReason] = useState<RefundReason>(REASONS[0].value);
  const [refundMethod, setRefundMethod] = useState('gateway');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [loadPreview, { data: previewData }] = useLazyQuery(PREVIEW_POST_CLASS_REFUND_CLAIM, {
    fetchPolicy: 'network-only',
  });
  const [submitClaim, { loading: submitting }] = useMutation(SUBMIT_POST_CLASS_REFUND_CLAIM, {
    refetchQueries: ['StudentBookedClassSessions'],
  });

  const preview = previewData?.previewPostClassRefundClaim;
  const allowedMethods = (preview?.allowedMethods ?? []) as string[];

  useEffect(() => {
    void loadPreview({ variables: { enrollmentId, reason } });
  }, [enrollmentId, reason, loadPreview]);

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContent}>
          <Text style={styles.title}>Refund claim submitted</Text>
          <Text style={styles.body}>
            Your request is under review. It will take up to 3 working days to process your
            refund.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={onComplete}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Claim refund</Text>
      <Text style={styles.intro}>Tell us why you are requesting a refund.</Text>
      <Text style={styles.sectionHeading}>Refund reason</Text>
      {REASONS.map((row) => (
        <TouchableOpacity key={row.value} style={styles.option} onPress={() => setReason(row.value)}>
          <Text style={reason === row.value ? styles.optionActive : styles.optionText}>
            {row.label}
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={[styles.sectionHeading, styles.sectionHeadingSpaced]}>Refund mode</Text>
      {['gateway', 'wallet', 'class_credit'].map((method) => {
        const disabled =
          !allowedMethods.includes(method) ||
          (method === 'class_credit' && reason === 'not_satisfied');
        return (
          <TouchableOpacity
            key={method}
            disabled={disabled}
            style={[styles.option, disabled && styles.optionDisabled]}
            onPress={() => setRefundMethod(method)}
          >
            <Text style={refundMethod === method ? styles.optionActive : styles.optionText}>
              {method === 'gateway'
                ? 'Cash refund (gateway)'
                : method === 'wallet'
                  ? 'Wallet refund'
                  : 'Class credit (same tutor)'}
            </Text>
          </TouchableOpacity>
        );
      })}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
        <Text style={styles.secondaryBtnText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.primaryBtn}
        disabled={submitting}
        onPress={() => {
          void submitClaim({
            variables: { enrollmentId, reason, refundMethod },
            onCompleted: () => setSuccess(true),
            onError: (e) => setError(e.message),
          });
        }}
      >
        <Text style={styles.primaryBtnText}>{submitting ? 'Submitting…' : 'Submit'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8f4ff' },
  content: { padding: 20, paddingBottom: 40 },
  successContent: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  doneBtn: {
    marginTop: 24,
    alignSelf: 'flex-start',
    minWidth: 120,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: '#143055',
    borderRadius: 12,
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#143055', marginBottom: 8 },
  intro: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 16 },
  sectionHeading: { fontSize: 14, fontWeight: '800', color: '#143055', marginBottom: 8 },
  sectionHeadingSpaced: { marginTop: 20 },
  body: { fontSize: 14, color: '#475569', lineHeight: 20 },
  option: { paddingVertical: 10 },
  optionDisabled: { opacity: 0.4 },
  optionText: { fontSize: 14, color: '#143055' },
  optionActive: { fontSize: 14, fontWeight: '800', color: '#143055' },
  error: { color: '#dc2626', marginTop: 8 },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#143055',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#143055', fontWeight: '700' },
});
