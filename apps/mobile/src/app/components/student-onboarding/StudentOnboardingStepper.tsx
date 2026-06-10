import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { StudentOnboardingStepId } from './types';
import { STUDENT_ONBOARDING_STEPS } from './types';

const STEP_SHORT_LABELS: Record<StudentOnboardingStepId, string> = {
  parent: 'Parent',
  address: 'Address',
  education: 'Education',
};

type StudentOnboardingStepperProps = {
  currentStepIndex: number;
};

export const StudentOnboardingStepper: React.FC<StudentOnboardingStepperProps> = ({
  currentStepIndex,
}) => {
  const steps = STUDENT_ONBOARDING_STEPS;

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isPending = index > currentStepIndex;

        return (
          <React.Fragment key={step.id}>
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isCurrent && styles.circleCurrent,
                  isPending && styles.circlePending,
                ]}
              >
                <Text
                  style={[
                    styles.circleText,
                    isPending && styles.circleTextPending,
                  ]}
                >
                  {isCompleted ? '✓' : index + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.label,
                  isCurrent && styles.labelCurrent,
                  isPending && styles.labelPending,
                ]}
                numberOfLines={1}
              >
                {STEP_SHORT_LABELS[step.id]}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  index < currentStepIndex
                    ? styles.connectorCompleted
                    : styles.connectorPending,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4,
  },
  stepCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: '#10b981',
  },
  circleCurrent: {
    backgroundColor: '#5fa8ff',
  },
  circlePending: {
    backgroundColor: '#e5e7eb',
  },
  circleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  circleTextPending: {
    color: '#6b7280',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(20, 48, 85, 0.7)',
    textAlign: 'center',
  },
  labelCurrent: {
    color: '#143055',
  },
  labelPending: {
    color: '#6b7280',
  },
  connector: {
    height: 2,
    flex: 1,
    marginTop: 15,
    minWidth: 12,
  },
  connectorCompleted: {
    backgroundColor: '#34d399',
  },
  connectorPending: {
    backgroundColor: '#e5e7eb',
  },
});
