import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import {
  PENDING_RATE_CARD_TASK_ACTION,
  PT_PASSED_RATE_CARD_LATER_ACTION,
  ptPassResultMessage,
} from '@tutorix/shared-utils/rate-card';

export type TutorPTResultProps = {
  passed: boolean;
  score: number;
  maxScore: number;
  passPercentage?: number;
  attemptsUsed: number;
  isPostOnboardingPt: boolean;
  onContinue: () => void;
  onSetRateCard?: () => void;
  onRetry: () => void;
  onExhaustedContinue?: () => void;
};

export const TutorPTResult: React.FC<TutorPTResultProps> = ({
  passed,
  score,
  maxScore,
  passPercentage,
  attemptsUsed,
  isPostOnboardingPt,
  onContinue,
  onSetRateCard,
  onRetry,
  onExhaustedContinue,
}) => {
  const hasMoreAttempts = attemptsUsed < 2;

  return (
    <View style={styles.block}>
      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>
          {passed
            ? 'Passed!'
            : hasMoreAttempts
              ? 'Not passed this time'
              : 'All attempts used'}
        </Text>
        <Text style={styles.mutedText}>
          Score: {score} / {maxScore}
        </Text>
        {passPercentage != null ? (
          <Text style={styles.mutedText}>
            Passing marks: {Math.ceil((passPercentage / 100) * maxScore)} ({passPercentage}%)
          </Text>
        ) : null}
        <Text style={styles.mutedText}>Attempts used: {attemptsUsed} / 2</Text>
      </View>
      <Text style={styles.mutedText}>
        {passed
          ? ptPassResultMessage(isPostOnboardingPt)
          : hasMoreAttempts
            ? 'You have one more attempt. Tap Retry to try again.'
            : isPostOnboardingPt
              ? 'Return to your profile to try again later.'
              : 'Please select another offering to continue.'}
      </Text>
      <View style={styles.buttonRow}>
        {passed ? (
          <>
            {isPostOnboardingPt ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onContinue}
                activeOpacity={0.7}
                accessibilityLabel={PT_PASSED_RATE_CARD_LATER_ACTION}
              >
                <Text style={styles.secondaryButtonText}>
                  {PT_PASSED_RATE_CARD_LATER_ACTION}
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={isPostOnboardingPt && onSetRateCard ? onSetRateCard : onContinue}
              activeOpacity={0.7}
              accessibilityLabel={
                isPostOnboardingPt ? PENDING_RATE_CARD_TASK_ACTION : 'Continue'
              }
            >
              <Text style={styles.primaryButtonText}>
                {isPostOnboardingPt ? PENDING_RATE_CARD_TASK_ACTION : 'Continue'}
              </Text>
            </TouchableOpacity>
          </>
        ) : hasMoreAttempts ? (
          <TouchableOpacity style={styles.primaryButton} onPress={onRetry} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>
        ) : onExhaustedContinue ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onExhaustedContinue}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>
              {isPostOnboardingPt ? 'Back to profile' : 'Continue'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: 16 },
  resultCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  resultTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  mutedText: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#5fa8ff',
    minWidth: 100,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 100,
    alignItems: 'center',
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
});
