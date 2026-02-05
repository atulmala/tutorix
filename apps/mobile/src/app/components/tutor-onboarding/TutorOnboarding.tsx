import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import { ONBOARDING_STEPS, normalizeCertificationStage } from '@tutorix/shared-utils';
import { TutorAddressEntry } from './tutor-address-entry/TutorAddressEntry';
import { TutorQualificationExperience } from './tutor-qualification-experience';
import { NavHeader } from '../NavHeader';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function stepIndexFromStage(stage: string | undefined): number {
  const normalized = normalizeCertificationStage(stage);
  if (!normalized) return 0;
  const idx = ONBOARDING_STEPS.findIndex((s) => s.id === normalized);
  return idx >= 0 ? idx : 0;
}

type TutorOnboardingProps = {
  initialProfile?: { certificationStage?: string } | null;
  onComplete?: () => void;
  onBack?: () => void;
  onLogout?: () => void;
};

function PlaceholderStep({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{title} - Coming soon</Text>
      {onBack && (
        <TouchableOpacity
          style={styles.placeholderBack}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.placeholderBackText}>Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export const TutorOnboarding: React.FC<TutorOnboardingProps> = ({
  initialProfile,
  onComplete,
  onBack,
  onLogout,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    stepIndexFromStage(initialProfile?.certificationStage)
  );

  const { data: profileData } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    const rawStage =
      profileData?.myTutorProfile?.certificationStage ??
      initialProfile?.certificationStage;
    const stage = normalizeCertificationStage(rawStage);
    if (!stage) return;
    const idx = ONBOARDING_STEPS.findIndex((s) => s.id === stage);
    if (idx >= 0) setCurrentStepIndex(idx);
  }, [profileData?.myTutorProfile?.certificationStage, initialProfile?.certificationStage]);

  const tutorName = useMemo(() => {
    const user = profileData?.myTutorProfile?.user;
    if (!user) return null;
    const first = user?.firstName?.trim() || '';
    const last = user?.lastName?.trim() || '';
    return [first, last].filter(Boolean).join(' ') || null;
  }, [profileData]);

  const stepConfig = ONBOARDING_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;

  const handleStepComplete = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  };

  const handleStepBack = () => {
    if (isFirstStep) {
      onBack?.();
    } else {
      setCurrentStepIndex((i) => i - 1);
    }
  };

  const renderStep = () => {
    if (stepConfig.id === 'address') {
      return (
        <TutorAddressEntry
          onComplete={handleStepComplete}
          onBack={isFirstStep ? onBack : handleStepBack}
        />
      );
    }
    if (stepConfig.id === 'qualificationExperience') {
      return (
        <TutorQualificationExperience
          onComplete={handleStepComplete}
          onBack={isFirstStep ? onBack : handleStepBack}
        />
      );
    }
    return (
      <PlaceholderStep
        title={stepConfig.title}
        onBack={isFirstStep ? onBack : handleStepBack}
      />
    );
  };

  const screenTitle =
    stepConfig.id === 'complete'
      ? "You're all set!"
      : stepConfig.id === 'address'
        ? 'Address Entry'
        : stepConfig.id === 'qualificationExperience'
          ? 'Qualifications & Experience'
          : stepConfig.title;
  const stepLabel =
    stepConfig.id === 'complete'
      ? undefined
      : `Step ${currentStepIndex + 1} of ${ONBOARDING_STEPS.length}`;
  const showBack = isFirstStep ? !!onBack : true;
  const handleBack = isFirstStep ? onBack : handleStepBack;

  return (
    <View style={styles.container}>
      <NavHeader
        title={screenTitle}
        stepLabel={stepLabel}
        onBack={showBack ? handleBack : undefined}
        userInitials={tutorName ? getInitials(tutorName) : null}
        onLogout={onLogout}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {renderStep()}
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
  placeholder: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  placeholderText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  placeholderBack: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  placeholderBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
});
