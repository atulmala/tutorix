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
  onStart: () => void;
};

export const PTIntroScreen: React.FC<PTIntroScreenProps> = ({
  testName = 'this test',
  timeMinutes = DEFAULT_TIME_MINUTES,
  maxMarks = DEFAULT_MAX_MARKS,
  passPercentage = DEFAULT_PASS_PERCENTAGE,
  attemptsLeft = 2,
  onStart,
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

      <View style={styles.noteCard}>
        <Text style={styles.noteText}>
          You will be allowed to change subject if you are not able to pass this{' '}
          {testName} in 2 attempts. Also once your onboarding is complete, you
          will be allowed to add more offerings.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onStart}
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
