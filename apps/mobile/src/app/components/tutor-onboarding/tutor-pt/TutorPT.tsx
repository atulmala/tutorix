import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_MY_TUTOR_DETAIL,
  GET_MY_TUTOR_PROFILE,
  GET_PROFICIENCY_TEST_FOR_TAKER,
} from '@tutorix/shared-graphql/queries';
import { SUBMIT_PROFICIENCY_TEST } from '@tutorix/shared-graphql/mutations';
import type { StepComponentProps } from '@tutorix/shared-utils';
import { PTIntroScreen } from './PTIntroScreen';
import { PTTestScreen } from './PTTestScreen';

type Screen = 'intro' | 'test' | 'result';

export type TutorPTProps = StepComponentProps & {
  context?: 'onboarding' | 'addOffering' | 'profile';
  tutorOfferingId?: number;
  offeringDisplayName?: string;
  ptFeeDisplayLabel?: string | null;
  testTutor?: boolean;
  attemptsUsed?: number;
};

export const TutorPT: React.FC<TutorPTProps> = ({
  onComplete,
  onReturnToOfferings,
  context = 'onboarding',
  tutorOfferingId: tutorOfferingIdProp,
  offeringDisplayName,
  ptFeeDisplayLabel,
  testTutor: testTutorProp,
  attemptsUsed: attemptsUsedProp = 0,
}) => {
  const [screen, setScreen] = useState<Screen>('intro');
  const [activeTutorOfferingId, setActiveTutorOfferingId] = useState<number | null>(
    tutorOfferingIdProp ?? null,
  );
  const [lastResult, setLastResult] = useState<{
    passed: boolean;
    score: number;
    maxScore: number;
    attemptsUsed: number;
    passPercentage?: number;
  } | null>(null);

  const isPostOnboardingPt =
    (context === 'addOffering' || context === 'profile') && tutorOfferingIdProp != null;
  const skipProfile = isPostOnboardingPt;

  const { data: profileData, loading: profileLoading, refetch: refetchProfile } = useQuery(
    GET_MY_TUTOR_PROFILE,
    { fetchPolicy: 'cache-and-network', skip: skipProfile },
  );

  const isTestTutor =
    testTutorProp === true || profileData?.myTutorProfile?.testTutor === true;

  const pendingOffering = useMemo(() => {
    if (tutorOfferingIdProp != null) {
      return {
        id: tutorOfferingIdProp,
        attemptsUsed: attemptsUsedProp,
        offering: { displayName: offeringDisplayName },
      };
    }
    const offerings = profileData?.myTutorProfile?.tutorOfferings ?? [];
    return offerings.find((o: { status: string }) => o.status === 'pending_pt');
  }, [
    profileData?.myTutorProfile?.tutorOfferings,
    tutorOfferingIdProp,
    offeringDisplayName,
    attemptsUsedProp,
  ]);

  const resolvedOfferingId = pendingOffering?.id ?? tutorOfferingIdProp;

  const { data: testData, loading: testLoading } = useQuery(
    GET_PROFICIENCY_TEST_FOR_TAKER,
    {
      variables: { tutorOfferingId: resolvedOfferingId },
      skip: !resolvedOfferingId,
      fetchPolicy: isTestTutor ? 'network-only' : 'cache-first',
    },
  );

  const [submitTest] = useMutation(SUBMIT_PROFICIENCY_TEST, {
    refetchQueries: isPostOnboardingPt ? [{ query: GET_MY_TUTOR_DETAIL }] : undefined,
  });

  const offeringName =
    offeringDisplayName ?? pendingOffering?.offering?.displayName ?? undefined;
  const testMeta = testData?.proficiencyTestForTaker;
  const questions = testMeta?.questions ?? [];
  const timeMinutes = testMeta?.time ?? 30;
  const maxMarks = testMeta?.score ?? 30;
  const passPercentage = testMeta?.passPercentage ?? 65;

  const handleStart = () => {
    if (resolvedOfferingId) {
      setActiveTutorOfferingId(resolvedOfferingId);
      setScreen('test');
    }
  };

  const handleFinish = async (
    answers: { questionId: number; answerId: number }[],
    timeTakenSeconds: number
  ) => {
    const id = activeTutorOfferingId ?? resolvedOfferingId;
    if (!id) return;
    try {
      const result = await submitTest({
        variables: {
          input: {
            tutorOfferingId: id,
            answers,
            timeTakenSeconds,
          },
        },
      });
      const data = result.data?.submitProficiencyTest;
      const passed = data?.passed ?? false;
      const attemptsUsed = data?.attemptsUsed ?? 1;

      setLastResult({
        passed,
        score: data?.score ?? 0,
        maxScore: data?.maxScore ?? 0,
        attemptsUsed,
        passPercentage: data?.passPercentage,
      });
      setScreen('result');
    } catch {
      // Error handled by mutation
    }
  };

  if (!skipProfile && profileLoading) {
    return (
      <View style={styles.block}>
        <ActivityIndicator size="large" color="#5fa8ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!pendingOffering && screen === 'intro') {
    return (
      <View style={styles.block}>
        <Text style={styles.mutedText}>
          No pending proficiency test. Please select an offering first.
        </Text>
        {onReturnToOfferings && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onReturnToOfferings}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  if (screen === 'result' && lastResult) {
    const hasMoreAttempts = lastResult.attemptsUsed < 2;
    const passed = lastResult.passed;

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
            Score: {lastResult.score} / {lastResult.maxScore}
          </Text>
          {lastResult.passPercentage != null && (
            <Text style={styles.mutedText}>
              Passing marks:{' '}
              {Math.ceil(
                (lastResult.passPercentage / 100) * lastResult.maxScore
              )}{' '}
              ({lastResult.passPercentage}%)
            </Text>
          )}
          <Text style={styles.mutedText}>
            Attempts used: {lastResult.attemptsUsed} / 2
          </Text>
        </View>
        <Text style={styles.mutedText}>
          {passed
            ? isPostOnboardingPt
              ? 'You can now set a rate card for this offering from your profile.'
              : 'Congratulations! You have passed the proficiency test.'
            : hasMoreAttempts
              ? 'You have one more attempt. Tap Retry to try again.'
              : isPostOnboardingPt
                ? 'Return to your profile to try again later.'
                : 'Please select another offering to continue.'}
        </Text>
        <View style={styles.buttonRow}>
          {passed ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                if (!skipProfile) refetchProfile();
                onComplete?.();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>
                {isPostOnboardingPt ? 'Back to profile' : 'Continue'}
              </Text>
            </TouchableOpacity>
          ) : hasMoreAttempts ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setScreen('intro');
                setLastResult(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Retry</Text>
            </TouchableOpacity>
          ) : (onReturnToOfferings || isPostOnboardingPt) ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={isPostOnboardingPt ? onComplete : onReturnToOfferings}
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
  }

  if (screen === 'test') {
    if (testLoading) {
      return (
        <View style={styles.block}>
          <ActivityIndicator size="large" color="#5fa8ff" />
          <Text style={styles.loadingText}>Loading test...</Text>
        </View>
      );
    }
    if (questions.length === 0) {
      return (
        <View style={styles.block}>
          <Text style={styles.mutedText}>
            No questions available for this test.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setScreen('intro')}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.block}>
        {isTestTutor ? (
          <Text style={styles.testModeBanner}>
            Test mode: correct answers are highlighted in green.
          </Text>
        ) : null}
        <PTTestScreen
          questions={questions}
          timeMinutes={timeMinutes}
          onFinish={handleFinish}
        />
      </View>
    );
  }

  const testName = testMeta?.name ?? offeringName ?? 'this test';
  const attemptsLeft = 2 - (pendingOffering?.attemptsUsed ?? 0);

  return (
    <PTIntroScreen
      testName={testName}
      timeMinutes={timeMinutes}
      maxMarks={maxMarks}
      passPercentage={passPercentage}
      attemptsLeft={attemptsLeft}
      ptFeeDisplayLabel={ptFeeDisplayLabel}
      context={context}
      onStart={handleStart}
      onTakeLater={isPostOnboardingPt ? onComplete : undefined}
    />
  );
};

const styles = StyleSheet.create({
  block: {
    gap: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  mutedText: {
    fontSize: 14,
    color: '#64748b',
  },
  testModeBanner: {
    fontSize: 14,
    color: '#92400e',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
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
