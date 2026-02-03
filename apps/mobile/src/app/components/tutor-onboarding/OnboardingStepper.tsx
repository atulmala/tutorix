import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { ONBOARDING_STEPS, type OnboardingStepId } from '@tutorix/shared-utils';

const STEP_SHORT_LABELS: Record<OnboardingStepId, string> = {
  address: 'Address',
  qualificationExperience: 'Qualification',
  offerings: 'Offerings',
  pt: 'Proficiency',
  registrationPayment: 'Payment',
  docs: 'Documents',
  interview: 'Interview',
  complete: 'Onboarding Complete!',
};

function StepIcon({
  stepId,
  isCompleted,
  size = 16,
}: {
  stepId: OnboardingStepId;
  isCompleted: boolean;
  size?: number;
}) {
  if (isCompleted) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <Path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </Svg>
    );
  }
  if (stepId === 'address') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <Path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <Path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </Svg>
    );
  }
  if (stepId === 'complete') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" fill="#a7f3d0" stroke="#059669" strokeWidth="1.5" />
        <Path stroke="#047857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M8 12l3 3 5-6" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <Circle cx="12" cy="12" r="8" />
    </Svg>
  );
}

type OnboardingStepperProps = {
  currentStepIndex: number;
};

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({
  currentStepIndex,
}) => {
  const steps = ONBOARDING_STEPS;

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isPending = index > currentStepIndex;

        return (
          <React.Fragment key={step.id}>
            <View style={styles.step}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isCurrent && styles.circleCurrent,
                  isPending && styles.circlePending,
                ]}
              >
                <StepIcon
                  stepId={step.id}
                  isCompleted={isCompleted}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  isCurrent && styles.labelCurrent,
                  isCompleted && styles.labelCompleted,
                  isPending && styles.labelPending,
                ]}
                numberOfLines={step.id === 'complete' ? 2 : 1}
              >
                {step.id === 'complete'
                  ? 'Onboarding\nComplete!'
                  : STEP_SHORT_LABELS[step.id]}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  index < currentStepIndex ? styles.connectorCompleted : styles.connectorPending,
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
  },
  step: {
    alignItems: 'center',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  circleCurrent: {
    borderColor: '#5fa8ff',
    backgroundColor: '#5fa8ff',
  },
  circlePending: {
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  label: {
    marginTop: 6,
    fontSize: 10,
    textAlign: 'center',
    maxWidth: 54,
  },
  labelCurrent: {
    color: '#5fa8ff',
    fontWeight: '600',
  },
  labelCompleted: {
    color: '#059669',
    fontWeight: '500',
  },
  labelPending: {
    color: '#9ca3af',
  },
  connector: {
    flex: 1,
    minWidth: 12,
    height: 2,
    marginTop: 17,
    marginHorizontal: 2,
    borderRadius: 1,
  },
  connectorCompleted: {
    backgroundColor: '#34d399',
  },
  connectorPending: {
    backgroundColor: '#e5e7eb',
  },
});
