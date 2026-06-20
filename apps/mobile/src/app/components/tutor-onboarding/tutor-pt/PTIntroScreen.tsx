import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const DEFAULT_TIME_MINUTES = 30;
const DEFAULT_MAX_MARKS = 30;
const DEFAULT_PASS_PERCENTAGE = 65;

type PTIntroScreenProps = {
  testName?: string;
  timeMinutes?: number;
  maxMarks?: number;
  passPercentage?: number;
  attemptsLeft?: number;
  ptFeeMessage?: string | null;
  paymentRequired?: boolean;
  amountDueInr?: number;
  payLoading?: boolean;
  paymentError?: string | null;
  onPayFee?: () => void;
  context?: 'onboarding' | 'addOffering' | 'profile';
  onStart: () => void;
  onTakeLater?: () => void;
};

export const PTIntroScreen: React.FC<PTIntroScreenProps> = ({
  testName = 'this test',
  timeMinutes = DEFAULT_TIME_MINUTES,
  maxMarks = DEFAULT_MAX_MARKS,
  passPercentage = DEFAULT_PASS_PERCENTAGE,
  attemptsLeft = 2,
  ptFeeMessage,
  paymentRequired = false,
  amountDueInr,
  payLoading = false,
  paymentError,
  onPayFee,
  context = 'onboarding',
  onStart,
  onTakeLater,
}) => {
  const passingMarks = Math.ceil((passPercentage / 100) * maxMarks);

  return (
    <View style={styles.block}>
      <Text style={styles.title}>Proficiency Test</Text>
      <Text style={styles.intro}>
        You are about to start the proficiency test for {testName}.
      </Text>

      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{timeMinutes} minutes</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Attempts left</Text>
          <Text style={styles.detailValue}>{attemptsLeft}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Max marks</Text>
          <Text style={styles.detailValue}>{maxMarks}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Passing marks</Text>
          <Text style={styles.detailValue}>
            {passingMarks} ({passPercentage}%)
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Scoring</Text>
          <Text style={styles.detailValue}>
            1 mark per correct answer, no negative marking
          </Text>
        </View>
      </View>

      <View style={styles.importantCard}>
        <Text style={styles.importantText}>
          <Text style={styles.importantBold}>Important:</Text> Once the test
          starts, it cannot be stopped. Please ensure you have at least{' '}
          {timeMinutes} minutes of uninterrupted time before starting.
        </Text>
      </View>

      {ptFeeMessage ? (
        <View style={styles.feeCard}>
          <Text style={styles.feeText}>{ptFeeMessage}</Text>
          {paymentRequired ? (
            <Text style={styles.feeHint}>
              Pay the test fee before you can start the proficiency test.
            </Text>
          ) : null}
        </View>
      ) : null}

      {paymentError ? (
        <Text style={styles.paymentError}>{paymentError}</Text>
      ) : null}

      <View style={styles.noteCard}>
        <Text style={styles.noteText}>
          {context === 'onboarding'
            ? `You will be allowed to change subject if you are not able to pass this ${testName} in 2 attempts. Also once your onboarding is complete, you will be allowed to add more offerings.`
            : 'You have up to 2 attempts to pass this test for this offering. After passing, set your rate card from your profile.'}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        {onTakeLater ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onTakeLater}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Take later</Text>
          </TouchableOpacity>
        ) : null}
        {paymentRequired && onPayFee ? (
          <TouchableOpacity
            style={[styles.primaryButton, payLoading && styles.buttonDisabled]}
            onPress={onPayFee}
            disabled={payLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>
              {payLoading ? 'Processing…' : `Pay ₹${amountDueInr ?? ''}`}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (paymentRequired || payLoading) && styles.buttonDisabled,
          ]}
          onPress={onStart}
          disabled={paymentRequired || payLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>Start Test</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    gap: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  intro: {
    fontSize: 14,
    color: '#64748b',
  },
  detailsCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  importantCard: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12,
    padding: 16,
  },
  importantText: {
    fontSize: 14,
    color: '#92400e',
  },
  importantBold: {
    fontWeight: '600',
  },
  feeCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 16,
  },
  feeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#78350f',
  },
  feeHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#92400e',
  },
  paymentError: {
    fontSize: 14,
    color: '#b91c1c',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  noteCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
  },
  noteText: {
    fontSize: 14,
    color: '#64748b',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
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
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
