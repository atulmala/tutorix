import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_MY_TUTOR_PROFILE,
  GET_PROFICIENCY_TEST_FOR_TAKER,
  SUBMIT_PROFICIENCY_TEST,
} from '@tutorix/shared-graphql';
import type { StepComponentProps } from '../types';
import { PTIntroScreen } from './PTIntroScreen';
import { PTTestScreen } from './PTTestScreen';

type Screen = 'intro' | 'test' | 'result';

export const TutorPT: React.FC<StepComponentProps> = ({
  onComplete,
  onReturnToOfferings,
}) => {
  const [screen, setScreen] = useState<Screen>('intro');
  const [tutorOfferingId, setTutorOfferingId] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{
    passed: boolean;
    score: number;
    maxScore: number;
    attemptsUsed: number;
    passPercentage?: number;
  } | null>(null);

  const { data: profileData, loading: profileLoading, refetch: refetchProfile } = useQuery(
    GET_MY_TUTOR_PROFILE,
    { fetchPolicy: 'cache-and-network' },
  );

  const pendingOffering = useMemo(() => {
    const offerings = profileData?.myTutorProfile?.tutorOfferings ?? [];
    return offerings.find((o: { status: string }) => o.status === 'pending_pt');
  }, [profileData?.myTutorProfile?.tutorOfferings]);

  const { data: testData, loading: testLoading } = useQuery(
    GET_PROFICIENCY_TEST_FOR_TAKER,
    {
      variables: { tutorOfferingId: pendingOffering?.id },
      skip: !pendingOffering?.id,
      fetchPolicy: 'cache-first',
    },
  );

  const [submitTest] = useMutation(
    SUBMIT_PROFICIENCY_TEST,
  );

  const offeringName = pendingOffering?.offering?.displayName ?? undefined;
  const testMeta = testData?.proficiencyTestForTaker;
  const questions = testMeta?.questions ?? [];
  const timeMinutes = testMeta?.time ?? 30;
  const maxMarks = testMeta?.score ?? 30;
  const passPercentage = testMeta?.passPercentage ?? 65;

  const handleStart = () => {
    if (pendingOffering?.id) {
      setTutorOfferingId(pendingOffering.id);
      setScreen('test');
    }
  };

  const handleFinish = async (
    answers: { questionId: number; answerId: number }[],
    timeTakenSeconds: number
  ) => {
    if (!tutorOfferingId) return;
    try {
      const result = await submitTest({
        variables: {
          input: {
            tutorOfferingId,
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

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  if (!pendingOffering && screen === 'intro') {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted">
          No pending proficiency test. Please select an offering first.
        </p>
        {onReturnToOfferings && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onReturnToOfferings}
              className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'result' && lastResult) {
    const hasMoreAttempts = lastResult.attemptsUsed < 2;
    const passed = lastResult.passed;

    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-subtle bg-gray-50/80 p-4 space-y-2">
          <p className="text-base font-medium text-primary">
            {passed
              ? 'Passed!'
              : hasMoreAttempts
                ? 'Not passed this time'
                : 'All attempts used'}
          </p>
          <p className="text-sm text-muted">
            Score: {lastResult.score} / {lastResult.maxScore}
          </p>
          {lastResult.passPercentage != null && (
            <p className="text-sm text-muted">
              Passing marks: {Math.ceil((lastResult.passPercentage / 100) * lastResult.maxScore)} ({lastResult.passPercentage}%)
            </p>
          )}
          <p className="text-sm text-muted">
            Attempts used: {lastResult.attemptsUsed} / 2
          </p>
        </div>
        <p className="text-sm text-muted">
          {passed
            ? 'Congratulations! You have passed the proficiency test.'
            : hasMoreAttempts
              ? 'You have one more attempt. Click Retry to try again.'
              : 'Please select another offering to continue.'}
        </p>
        <div className="flex justify-end gap-3">
          {passed ? (
            <button
              type="button"
              onClick={() => { refetchProfile(); onComplete?.(); }}
              className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
            >
              Continue
            </button>
          ) : hasMoreAttempts ? (
            <button
              type="button"
              onClick={() => {
                setScreen('intro');
                setLastResult(null);
              }}
              className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
            >
              Retry
            </button>
          ) : (
            onReturnToOfferings && (
              <button
                type="button"
                onClick={onReturnToOfferings}
                className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
              >
                Continue
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  if (screen === 'test') {
    if (testLoading) {
      return (
        <div className="space-y-6">
          <p className="text-sm text-muted">Loading test...</p>
        </div>
      );
    }
    if (questions.length === 0) {
      return (
        <div className="space-y-6">
          <p className="text-sm text-muted">
            No questions available for this test.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setScreen('intro')}
              className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
            >
              Continue
            </button>
          </div>
        </div>
      );
    }
    return (
      <PTTestScreen
        questions={questions}
        timeMinutes={timeMinutes}
        onFinish={handleFinish}
      />
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
      onStart={handleStart}
    />
  );
};
