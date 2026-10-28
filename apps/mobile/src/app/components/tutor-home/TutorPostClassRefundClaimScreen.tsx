import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { TUTOR_POST_CLASS_REFUND_CLAIM_DETAIL } from '@tutorix/shared-graphql/queries';
import { TUTOR_RESPOND_POST_CLASS_REFUND_CLAIM } from '@tutorix/shared-graphql/mutations';

type Props = {
  claimId: number;
  onComplete: () => void;
};

export const TutorPostClassRefundClaimScreen: React.FC<Props> = ({ claimId, onComplete }) => {
  const [accept, setAccept] = useState<boolean | null>(null);
  const [declineComment, setDeclineComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, loading } = useQuery(TUTOR_POST_CLASS_REFUND_CLAIM_DETAIL, {
    variables: { claimId },
    fetchPolicy: 'network-only',
  });
  const detail = data?.tutorPostClassRefundClaimDetail;

  const [respond, { loading: submitting }] = useMutation(TUTOR_RESPOND_POST_CLASS_REFUND_CLAIM, {
    refetchQueries: ['TutorBookedClassSessions', 'TutorPendingPostClassRefundClaimAlert'],
  });

  const handleSubmit = () => {
    if (accept == null) {
      setError('Choose accept or decline');
      return;
    }
    if (!accept && declineComment.trim() === '') {
      setError('Please explain why you are declining');
      return;
    }
    setError(null);
    void respond({
      variables: {
        claimId,
        accept,
        declineComment: accept ? null : declineComment.trim(),
      },
      onCompleted: () => onComplete(),
      onError: (e) => setError(e.message),
    });
  };

  if (loading && !detail) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }
  if (!detail) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Claim not found.</Text>
      </View>
    );
  }

  const alreadyResponded = detail.tutorResponseStatus !== 'pending';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Class refund request</Text>
      <Text style={styles.label}>Student</Text>
      <Text style={styles.value}>{detail.studentName}</Text>
      <Text style={styles.label}>Subject</Text>
      <Text style={styles.value}>{detail.offeringLabel}</Text>
      <Text style={styles.label}>Class</Text>
      <Text style={styles.value}>{detail.classTimeLabel}</Text>
      <Text style={styles.label}>Reason</Text>
      <Text style={styles.value}>{detail.reasonLabel}</Text>
      <Text style={styles.label}>Respond by</Text>
      <Text style={styles.value}>{detail.deadlineLabel}</Text>

      {alreadyResponded ? (
        <Text style={styles.muted}>You have already responded to this claim.</Text>
      ) : (
        <>
          <Text style={styles.sectionHeading}>Your response</Text>
          <TouchableOpacity style={styles.option} onPress={() => setAccept(true)}>
            <Text style={accept === true ? styles.optionActive : styles.optionText}>
              Accept refund claim
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={() => setAccept(false)}>
            <Text style={accept === false ? styles.optionActive : styles.optionText}>
              Decline refund claim
            </Text>
          </TouchableOpacity>
          {accept === false ? (
            <>
              <Text style={styles.declineHint}>
                Add a short note below explaining why (required to decline).
              </Text>
              <TextInput
                style={styles.declineInput}
                value={declineComment}
                onChangeText={setDeclineComment}
                placeholder="Why are you declining?"
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />
            </>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            style={styles.primaryBtn}
            disabled={submitting}
            onPress={handleSubmit}
          >
            <Text style={styles.primaryBtnText}>
              {submitting ? 'Submitting…' : 'Submit response'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8f4ff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#143055', marginBottom: 16 },
  label: { marginTop: 12, fontSize: 12, color: '#64748b' },
  value: { fontSize: 14, fontWeight: '700', color: '#143055' },
  sectionHeading: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '800',
    color: '#143055',
  },
  option: { paddingVertical: 10 },
  optionText: { fontSize: 14, color: '#143055' },
  optionActive: { fontSize: 14, fontWeight: '800', color: '#143055' },
  declineHint: { marginTop: 8, fontSize: 13, color: '#64748b' },
  declineInput: {
    marginTop: 8,
    minHeight: 88,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#143055',
    backgroundColor: '#fff',
  },
  muted: { marginTop: 16, fontSize: 14, color: '#64748b' },
  error: { marginTop: 8, color: '#dc2626' },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: '#143055',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
});
