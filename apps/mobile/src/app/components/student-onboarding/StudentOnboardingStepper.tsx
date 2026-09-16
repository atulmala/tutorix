import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { StudentOnboardingStepId } from '@tutorix/shared-utils/student-onboarding-types';
import { STUDENT_ONBOARDING_STEPS } from '@tutorix/shared-utils/student-onboarding-types';

type IconProps = {
  color: string;
  size?: number;
};

function ParentIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AddressIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EducationIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 10 12 5 2 10l10 5 10-5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 12v5c0 .7 2.7 3 6 3s6-2.3 6-3v-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PaymentIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 8h18M3 12h18M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StepIcon({
  stepId,
  color,
}: {
  stepId: StudentOnboardingStepId;
  color: string;
}) {
  switch (stepId) {
    case 'parent':
      return <ParentIcon color={color} />;
    case 'address':
      return <AddressIcon color={color} />;
    case 'education':
      return <EducationIcon color={color} />;
    case 'registrationPayment':
      return <PaymentIcon color={color} />;
    default:
      return null;
  }
}

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
        const iconColor = isPending ? '#6b7280' : '#fff';

        return (
          <React.Fragment key={step.id}>
            <View
              style={[
                styles.circle,
                isCompleted && styles.circleCompleted,
                isCurrent && styles.circleCurrent,
                isPending && styles.circlePending,
              ]}
              accessible
              accessibilityRole="image"
              accessibilityLabel={step.title}
              accessibilityState={{ selected: isCurrent }}
            >
              <StepIcon stepId={step.id} color={iconColor} />
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  connector: {
    height: 2,
    flex: 1,
    minWidth: 12,
    marginHorizontal: 6,
    borderRadius: 1,
  },
  connectorCompleted: {
    backgroundColor: '#34d399',
  },
  connectorPending: {
    backgroundColor: '#e5e7eb',
  },
});
