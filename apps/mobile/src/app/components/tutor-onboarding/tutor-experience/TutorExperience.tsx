import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useMutation } from '@apollo/client';
import { COMPLETE_EXPERIENCE_STEP } from '@tutorix/shared-graphql/mutations';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import type { StepComponentProps } from '@tutorix/shared-utils';

export const TutorExperience: React.FC<StepComponentProps> = ({ onBack }) => {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [completeExperience, { loading: isSubmitting }] = useMutation(
    COMPLETE_EXPERIENCE_STEP,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
      update: (cache, { data }) => {
        if (!data?.completeExperienceStep) return;
        try {
          const existing = cache.readQuery<{
            myTutorProfile?: { id: number; certificationStage?: string };
          }>({ query: GET_MY_TUTOR_PROFILE });
          if (existing?.myTutorProfile) {
            cache.writeQuery({
              query: GET_MY_TUTOR_PROFILE,
              data: {
                myTutorProfile: {
                  ...existing.myTutorProfile,
                  certificationStage: 'offerings',
                },
              },
            });
          }
        } catch {
          /* ignore */
        }
      },
      onCompleted: () => {
        // Don't call onComplete - refetch updates profileData, useEffect in
        // TutorOnboarding syncs currentStepIndex from certificationStage.
        // Calling onComplete would double-advance and skip the next step.
      },
      onError: (error) => {
        setSubmitError(
          error.graphQLErrors?.[0]?.message ||
            error.message ||
            'Failed to complete step. Please try again.'
        );
      },
    }
  );

  const handleContinue = () => {
    setSubmitError(null);
    completeExperience();
  };

  return (
    <View style={styles.block}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Experience entry</Text>
        <Text style={styles.muted}>
          Teaching and work experience entry will be available here. You can continue to
          the next step for now.
        </Text>
      </View>

      {submitError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        {onBack && (
          <TouchableOpacity style={styles.secondaryButton} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
          onPress={handleContinue}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    gap: 24,
  },
  muted: {
    fontSize: 14,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    gap: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#5fa8ff',
    minWidth: 100,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
