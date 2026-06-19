import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  CONFIRM_PT_FEE_PAYMENT,
  GET_MY_TUTOR_DETAIL,
  GET_MY_TUTOR_PROFILE,
  GET_PROFICIENCY_TEST_FOR_TAKER,
  GET_PT_FEE_INFO,
  INITIATE_PT_FEE_PAYMENT,
  SUBMIT_PROFICIENCY_TEST,
} from '@tutorix/shared-graphql';
import {
  isPtFeePaymentRequired,
  runPtFeePaymentCheckout,
  type PaymentOrderSession,
  type PtFeeInfo,
} from '@tutorix/shared-utils';
import type { StepComponentProps } from '../types';
import { PTIntroScreen } from './PTIntroScreen';
import { PTTestScreen } from './PTTestScreen';

type Screen = 'intro' | 'test' | 'result';

export type TutorPTProps = StepComponentProps & {
  context?: 'onboarding' | 'addOffering' | 'profile';
  tutorOfferingId?: number;
  offeringDisplayName?: string;
  ptFeeDisplayLabel?: string | null;
  /** When set (e.g. profile PT), avoids loading full myTutorProfile for test-tutor UI. */
  testTutor?: boolean;
  /** Prior PT attempts used for this tutor offering (profile / add-offering flows). */
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
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

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

  const { data: ptFeeData, refetch: refetchPtFee } = useQuery(GET_PT_FEE_INFO, {
    variables: { tutorOfferingId: resolvedOfferingId },
    skip: !resolvedOfferingId,
    fetchPolicy: 'cache-and-network',
  });

  const ptFeeInfo = ptFeeData?.ptFeeInfo as PtFeeInfo | undefined;
  const paymentRequired = ptFeeInfo ? isPtFeePaymentRequired(ptFeeInfo) : false;
  const ptFeeDisplayLabelResolved =
    ptFeeInfo?.displayLabel ?? ptFeeDisplayLabel ?? null;

  const [initiatePtFeePayment] = useMutation(INITIATE_PT_FEE_PAYMENT);
  const [confirmPtFeePayment] = useMutation(CONFIRM_PT_FEE_PAYMENT);

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

  const handlePayFee = async () => {
    if (!resolvedOfferingId) return;
    setPaymentError(null);
    setPayLoading(true);
    try {
      await runPtFeePaymentCheckout(
        resolvedOfferingId,
        async (offeringId) => {
          const result = await initiatePtFeePayment({
            variables: { tutorOfferingId: offeringId },
          });
          return result.data?.initiatePtFeePayment as PaymentOrderSession;
        },
        async (input) => {
          await confirmPtFeePayment({ variables: { input } });
        },
      );
      await refetchPtFee();
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : 'Could not complete payment. Try again or contact support.',
      );
    } finally {
      setPayLoading(false);
    }
  };

  const handleStart = () => {
    if (resolvedOfferingId) {
      setActiveTutorOfferingId(resolvedOfferingId);
      setScreen('test');
    }
  };

  const handleFinish = async (
    answers: { questionId: number; answerId: number }[],
    timeTakenSeconds: number,
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
              Passing marks:{' '}
              {Math.ceil((lastResult.passPercentage / 100) * lastResult.maxScore)} (
              {lastResult.passPercentage}%)
            </p>
          )}
          <p className="text-sm text-muted">
            Attempts used: {lastResult.attemptsUsed} / 2
          </p>
        </div>
        <p className="text-sm text-muted">
          {passed
            ? isPostOnboardingPt
              ? 'You can now set a rate card for this offering from your profile.'
              : 'Congratulations! You have passed the proficiency test.'
            : hasMoreAttempts
              ? 'You have one more attempt. Click Retry to try again.'
              : isPostOnboardingPt
                ? 'Return to your profile to try another offering later.'
                : 'Please select another offering to continue.'}
        </p>
        <div className="flex justify-end gap-3">
          {passed ? (
            <button
              type="button"
              onClick={() => {
                if (!skipProfile) refetchProfile();
                onComplete?.();
              }}
              className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
            >
              {isPostOnboardingPt ? 'Back to profile' : 'Continue'}
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
            (onReturnToOfferings || isPostOnboardingPt) && (
              <button
                type="button"
                onClick={isPostOnboardingPt ? onComplete : onReturnToOfferings}
                className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
              >
                {isPostOnboardingPt ? 'Back to profile' : 'Continue'}
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
          <p className="text-sm text-muted">No questions available for this test.</p>
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
      <div className="space-y-6">
        {isTestTutor ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Test mode: correct answers are highlighted in green.
          </p>
        ) : null}
        <PTTestScreen
          questions={questions}
          timeMinutes={timeMinutes}
          onFinish={handleFinish}
        />
      </div>
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
      ptFeeDisplayLabel={ptFeeDisplayLabelResolved}
      paymentRequired={paymentRequired}
      amountDueInr={ptFeeInfo?.amountDueInr}
      payLoading={payLoading}
      paymentError={paymentError}
      onPayFee={() => void handlePayFee()}
      context={context}
      onStart={handleStart}
      onTakeLater={isPostOnboardingPt ? onComplete : undefined}
    />
  );
};
