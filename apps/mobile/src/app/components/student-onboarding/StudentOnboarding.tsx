import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@apollo/client';
import { GET_MY_STUDENT_PROFILE } from '@tutorix/shared-graphql/queries';
import {
  STUDENT_ONBOARDING_STEPS,
  normalizeStudentOnboardingStage,
  type StudentOnboardingStepId,
  type StudentStepComponentProps,
} from './types';
import { StudentOnboardingStepper } from './StudentOnboardingStepper';
import { StudentParentStep } from './StudentParentStep';
import { StudentAddressStep } from './StudentAddressStep';
import { StudentEducationStep } from './StudentEducationStep';
import { NavHeader } from '../NavHeader';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function stepIndexFromStage(stage: string | undefined): number {
  const normalized = normalizeStudentOnboardingStage(stage);
  if (!normalized) return 0;
  const idx = STUDENT_ONBOARDING_STEPS.findIndex((s) => s.id === normalized);
  return idx >= 0 ? idx : 0;
}

const STEP_COMPONENTS: Record<
  StudentOnboardingStepId,
  React.FC<StudentStepComponentProps>
> = {
  parent: StudentParentStep,
  address: StudentAddressStep,
  education: StudentEducationStep,
};

type StudentOnboardingProps = {
  initialProfile?: { onboardingStage?: string } | null;
  onComplete?: () => void;
  onLogout?: () => void;
};

export const StudentOnboarding: React.FC<StudentOnboardingProps> = ({
  initialProfile,
  onComplete,
  onLogout,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    stepIndexFromStage(initialProfile?.onboardingStage),
  );

  const { data: profileData } = useQuery(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });
  const myStudentProfile = profileData?.myStudentProfile;

  useEffect(() => {
    const rawStage =
      myStudentProfile?.onboardingStage ?? initialProfile?.onboardingStage;
    const stage = normalizeStudentOnboardingStage(rawStage);
    if (!stage) return;
    const idx = STUDENT_ONBOARDING_STEPS.findIndex((s) => s.id === stage);
    if (idx < 0) return;
    setCurrentStepIndex((current) => (idx >= current ? idx : current));
  }, [myStudentProfile, initialProfile?.onboardingStage]);

  const studentName = useMemo(() => {
    const user = profileData?.myStudentProfile?.user;
    if (!user) return null;
    const first = user?.firstName?.trim() || '';
    const last = user?.lastName?.trim() || '';
    return [first, last].filter(Boolean).join(' ') || null;
  }, [profileData]);

  const stepConfig = useMemo(
    () => STUDENT_ONBOARDING_STEPS[currentStepIndex],
    [currentStepIndex],
  );
  const StepComponent = useMemo(
    () => STEP_COMPONENTS[stepConfig.id],
    [stepConfig.id],
  );
  const isLastStep = currentStepIndex === STUDENT_ONBOARDING_STEPS.length - 1;

  const handleStepComplete = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  };

  const stepLabel = `Step ${currentStepIndex + 1} of ${STUDENT_ONBOARDING_STEPS.length}`;

  return (
    <View style={styles.container}>
      <NavHeader
        title="Student Setup"
        stepLabel={stepLabel}
        userInitials={studentName ? getInitials(studentName) : null}
        onLogout={onLogout}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Student Setup</Text>
              <Text style={styles.subtitle}>
                {stepLabel} · {stepConfig.title}
              </Text>
            </View>
            {studentName && (
              <View style={styles.nameBadge}>
                <Text style={styles.nameBadgeText}>{studentName}</Text>
              </View>
            )}
          </View>

          <View style={styles.stepperTray}>
            <StudentOnboardingStepper currentStepIndex={currentStepIndex} />
          </View>

          <StepComponent onComplete={handleStepComplete} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#143055',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  nameBadge: {
    backgroundColor: 'rgba(20, 48, 85, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nameBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#143055',
  },
  stepperTray: {
    backgroundColor: 'rgba(249, 250, 251, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 24,
  },
});
