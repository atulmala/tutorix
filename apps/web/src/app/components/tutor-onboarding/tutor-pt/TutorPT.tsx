import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import {
  COMPLETE_WALLET_PURCHASE,
  CONFIRM_WALLET_TOP_UP,
  CREDIT_OVERLAPPING_PT_PASS,
  GET_MY_TUTOR_DETAIL,
  GET_MY_TUTOR_PROFILE,
  GET_PROFICIENCY_TEST_FOR_TAKER,
  GET_PT_FEE_INFO,
  INITIATE_WALLET_TOP_UP,
  PREPARE_WALLET_PURCHASE,
  SAVE_MY_TUTOR_OFFERING_RATE_CARD,
  SUBMIT_PROFICIENCY_TEST,
} from '@tutorix/shared-graphql';
import {
  formatProficiencyTestFeeMessage,
  hasPassedOverlappingPt,
  isPtFeePaymentRequired,
  PT_PASSED_RATE_CARD_MESSAGE,
  PT_PASSED_RATE_CARD_LATER_ACTION,
  RATE_CARD_SETUP_HEADING,
  runWalletAwarePurchaseCheckout,
  type PtFeeInfo,
  type PtOverlapOfferingLike,
  type RateCardFormValues,
  type WalletPurchaseIntent,
  type WalletPurchasePreview,
} from '@tutorix/shared-utils';
import { RateCardModal } from '@tutorix/tutor-detail-ui';
import type { StepComponentProps } from '../types';
import { PTIntroScreen } from './PTIntroScreen';
import { PTTestScreen } from './PTTestScreen';
import { TutorPTResult } from './TutorPTResult';
import { PtAlreadyClearedPrompt } from './PtAlreadyClearedPrompt';
import { WalletLowBalanceDialog } from '../../wallet';

type Screen = 'intro' | 'test' | 'result';

function rateCardInput(tutorOfferingId: number, values: RateCardFormValues) {
  return {
    tutorOfferingId,
    freeDemoOffered: values.freeDemoOffered,
    offlineEnabled: values.offlineEnabled,
    offlineBaseRate: values.offlineEnabled ? values.offlineBaseRate : null,
    offlineBaseDiscountPct: values.offlineEnabled ? values.offlineBaseDiscountPct : null,
    offlineSlab2DiscountPct: values.offlineEnabled ? values.offlineSlab2DiscountPct : null,
    offlineSlab3DiscountPct: values.offlineEnabled ? values.offlineSlab3DiscountPct : null,
    offlineBatchSize: values.offlineEnabled ? values.offlineBatchSize : null,
    onlineEnabled: values.onlineEnabled,
    onlineBaseRate: values.onlineEnabled ? values.onlineBaseRate : null,
    onlineBaseDiscountPct: values.onlineEnabled ? values.onlineBaseDiscountPct : null,
    onlineSlab2DiscountPct: values.onlineEnabled ? values.onlineSlab2DiscountPct : null,
    onlineSlab3DiscountPct: values.onlineEnabled ? values.onlineSlab3DiscountPct : null,
    onlineBatchSize: values.onlineEnabled ? values.onlineBatchSize : null,
  };
}

export type TutorPTProps = StepComponentProps & {
  context?: 'onboarding' | 'addOffering' | 'profile';
  tutorOfferingId?: number;
  offeringDisplayName?: string;
  /** @deprecated Prefer fee messaging loaded via GET_PT_FEE_INFO in this component. */
  ptFeeDisplayLabel?: string | null;
  /** When set (e.g. profile PT), avoids loading full myTutorProfile for test-tutor UI. */
  testTutor?: boolean;
  /** Prior PT attempts used for this tutor offering (profile / add-offering flows). */
  attemptsUsed?: number;
  /** Current tutor offerings, used to detect a shared already-passed PT. */
  tutorOfferings?: PtOverlapOfferingLike[];
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
  tutorOfferings: tutorOfferingsProp,
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
  const [showRateCardSetup, setShowRateCardSetup] = useState(false);
  const [rateCardError, setRateCardError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [walletPreview, setWalletPreview] = useState<WalletPurchasePreview | null>(null);
  const [topUpAmount, setTopUpAmount] = useState(0);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [overlapError, setOverlapError] = useState<string | null>(null);
  const [overlapLoading, setOverlapLoading] = useState(false);

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
  const isOnboardingPt = context === 'onboarding';

  const { data: detailData } = useQuery(GET_MY_TUTOR_DETAIL, {
    skip: isOnboardingPt || tutorOfferingsProp != null,
    fetchPolicy: 'cache-and-network',
  });

  const offeringsForOverlap = useMemo((): PtOverlapOfferingLike[] => {
    if (tutorOfferingsProp) {
      return tutorOfferingsProp;
    }
    if (isOnboardingPt) {
      return profileData?.myTutorProfile?.tutorOfferings ?? [];
    }
    return detailData?.myTutorDetail?.offerings ?? [];
  }, [
    tutorOfferingsProp,
    isOnboardingPt,
    profileData?.myTutorProfile?.tutorOfferings,
    detailData?.myTutorDetail?.offerings,
  ]);

  const overlappingPass = hasPassedOverlappingPt(
    offeringsForOverlap,
    offeringsForOverlap.find((offering) => offering.id === resolvedOfferingId) ?? {
      id: resolvedOfferingId,
    },
  );

  const { data: ptFeeData, refetch: refetchPtFee } = useQuery(GET_PT_FEE_INFO, {
    variables: { tutorOfferingId: resolvedOfferingId },
    skip: isOnboardingPt || !resolvedOfferingId || overlappingPass,
    fetchPolicy: 'cache-and-network',
  });

  const ptFeeInfo = ptFeeData?.ptFeeInfo as PtFeeInfo | undefined;
  const paymentRequired =
    !isOnboardingPt && ptFeeInfo ? isPtFeePaymentRequired(ptFeeInfo) : false;
  const ptFeeMessage = useMemo(() => {
    if (isOnboardingPt) {
      return null;
    }
    if (ptFeeInfo) {
      return formatProficiencyTestFeeMessage({
        listPriceInr: ptFeeInfo.listPriceInr,
        amountDueInr: ptFeeInfo.amountDueInr,
        displayName: 'proficiency test fee',
      });
    }
    return ptFeeDisplayLabel ?? null;
  }, [isOnboardingPt, ptFeeInfo, ptFeeDisplayLabel]);

  const [prepareWalletPurchaseQuery] = useLazyQuery(PREPARE_WALLET_PURCHASE, {
    fetchPolicy: 'network-only',
  });
  const [completeWalletPurchase] = useMutation(COMPLETE_WALLET_PURCHASE);
  const [initiateWalletTopUp] = useMutation(INITIATE_WALLET_TOP_UP);
  const [confirmWalletTopUp] = useMutation(CONFIRM_WALLET_TOP_UP);

  const { data: testData, loading: testLoading } = useQuery(
    GET_PROFICIENCY_TEST_FOR_TAKER,
    {
      variables: { tutorOfferingId: resolvedOfferingId },
      skip: !resolvedOfferingId || overlappingPass,
      fetchPolicy: isTestTutor ? 'network-only' : 'cache-first',
    },
  );

  const [submitTest] = useMutation(SUBMIT_PROFICIENCY_TEST, {
    refetchQueries: isPostOnboardingPt ? [{ query: GET_MY_TUTOR_DETAIL }] : undefined,
  });
  const [saveRateCard, { loading: savingRateCard }] = useMutation(
    SAVE_MY_TUTOR_OFFERING_RATE_CARD,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }, { query: GET_MY_TUTOR_DETAIL }],
      awaitRefetchQueries: true,
    },
  );
  const [creditOverlappingPtPass] = useMutation(CREDIT_OVERLAPPING_PT_PASS, {
    refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }, { query: GET_MY_TUTOR_DETAIL }],
  });

  const offeringName =
    offeringDisplayName ?? pendingOffering?.offering?.displayName ?? undefined;
  const testMeta = testData?.proficiencyTestForTaker;
  const questions = testMeta?.questions ?? [];
  const timeMinutes = testMeta?.time ?? 30;
  const maxMarks = testMeta?.score ?? 30;
  const passPercentage = testMeta?.passPercentage ?? 65;

  const buildPurchaseIntent = (): WalletPurchaseIntent | null => {
    if (!resolvedOfferingId) return null;
    return {
      itemType: 'PROFICIENCY_TEST',
      referenceType: 'tutor_offering',
      referenceId: resolvedOfferingId,
    };
  };

  const runWalletPtPayment = async (amountOverride?: number) => {
    const purchaseIntent = buildPurchaseIntent();
    if (!purchaseIntent) return;

    await runWalletAwarePurchaseCheckout(
      purchaseIntent,
      async (intent) => {
        const response = await prepareWalletPurchaseQuery({
          variables: { input: { purchaseIntent: intent } },
        });
        const preview = response.data?.prepareWalletPurchase;
        if (!preview) {
          throw new Error('Could not prepare wallet purchase');
        }
        return preview as WalletPurchasePreview;
      },
      async (intent) => {
        const response = await completeWalletPurchase({
          variables: { purchaseIntent: intent },
        });
        return response.data?.completeWalletPurchase ?? { wallet: { balanceInr: 0 } };
      },
      async (input) => {
        const response = await initiateWalletTopUp({ variables: { input } });
        return response.data?.initiateWalletTopUp ?? null;
      },
      async (input) => {
        const response = await confirmWalletTopUp({ variables: { input } });
        return response.data?.confirmWalletTopUp ?? { wallet: { balanceInr: 0 } };
      },
      async (preview) => amountOverride ?? preview.shortfallInr,
    );

    await refetchPtFee();
  };

  const handlePayFee = async () => {
    if (!resolvedOfferingId || isOnboardingPt) return;
    setPaymentError(null);
    setPayLoading(true);
    try {
      const purchaseIntent = buildPurchaseIntent();
      if (!purchaseIntent) return;

      const previewResult = await prepareWalletPurchaseQuery({
        variables: { input: { purchaseIntent } },
      });
      const preview = previewResult.data?.prepareWalletPurchase as
        | WalletPurchasePreview
        | undefined;
      if (!preview) {
        throw new Error('Could not prepare wallet purchase');
      }

      if (preview.canPayFromWallet) {
        await runWalletPtPayment();
        return;
      }

      setWalletPreview(preview);
      setTopUpAmount(preview.shortfallInr);
      setTopUpError(null);
      setShowTopUpDialog(true);
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

  const handleConfirmTopUp = async () => {
    if (!walletPreview) return;
    setTopUpError(null);
    setPayLoading(true);
    try {
      await runWalletPtPayment(topUpAmount);
      setShowTopUpDialog(false);
      setWalletPreview(null);
    } catch (error) {
      setTopUpError(
        error instanceof Error
          ? error.message
          : 'Could not complete payment. Try again or contact support.',
      );
    } finally {
      setPayLoading(false);
    }
  };

  const handleStart = () => {
    if (overlappingPass) {
      return;
    }
    if (resolvedOfferingId) {
      setActiveTutorOfferingId(resolvedOfferingId);
      setScreen('test');
    }
  };

  const finishPtFlow = () => {
    if (!skipProfile) {
      void refetchProfile();
    }
    onComplete?.();
  };

  const handleAcknowledgeOverlap = async () => {
    if (!resolvedOfferingId) {
      return;
    }
    setOverlapError(null);
    setOverlapLoading(true);
    try {
      await creditOverlappingPtPass({
        variables: { tutorOfferingId: resolvedOfferingId },
      });
      finishPtFlow();
    } catch (err) {
      setOverlapError(
        err instanceof Error ? err.message : 'Could not update this offering.',
      );
    } finally {
      setOverlapLoading(false);
    }
  };

  const handleSaveRateCard = async (values: RateCardFormValues) => {
    const tutorOfferingId = activeTutorOfferingId ?? resolvedOfferingId;
    if (!tutorOfferingId) {
      return;
    }
    setRateCardError(null);
    try {
      await saveRateCard({
        variables: { input: rateCardInput(tutorOfferingId, values) },
      });
      finishPtFlow();
    } catch (err) {
      setRateCardError(err instanceof Error ? err.message : 'Could not save rate card.');
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

  if (overlappingPass && screen === 'intro') {
    return (
      <PtAlreadyClearedPrompt
        onAcknowledge={() => void handleAcknowledgeOverlap()}
        acknowledging={overlapLoading}
        error={overlapError}
      />
    );
  }

  if (screen === 'result' && lastResult) {
    if (showRateCardSetup && isPostOnboardingPt && lastResult.passed) {
      return (
        <RateCardModal
          open
          required
          heading={RATE_CARD_SETUP_HEADING}
          description={PT_PASSED_RATE_CARD_MESSAGE}
          laterLabel={PT_PASSED_RATE_CARD_LATER_ACTION}
          offeringName={offeringName ?? 'this offering'}
          saving={savingRateCard}
          error={rateCardError}
          onClose={finishPtFlow}
          onSubmit={(values) => {
            void handleSaveRateCard(values);
          }}
        />
      );
    }

    return (
      <TutorPTResult
        passed={lastResult.passed}
        score={lastResult.score}
        maxScore={lastResult.maxScore}
        passPercentage={lastResult.passPercentage}
        attemptsUsed={lastResult.attemptsUsed}
        isPostOnboardingPt={isPostOnboardingPt}
        onContinue={finishPtFlow}
        onSetRateCard={() => {
          setRateCardError(null);
          setShowRateCardSetup(true);
        }}
        onRetry={() => {
          setScreen('intro');
          setLastResult(null);
          setShowRateCardSetup(false);
        }}
        onExhaustedContinue={
          onReturnToOfferings || isPostOnboardingPt
            ? isPostOnboardingPt
              ? finishPtFlow
              : onReturnToOfferings
            : undefined
        }
      />
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
    <>
      <WalletLowBalanceDialog
        open={showTopUpDialog}
        preview={walletPreview}
        topUpAmount={topUpAmount}
        loading={payLoading}
        error={topUpError}
        onTopUpAmountChange={setTopUpAmount}
        onConfirm={() => void handleConfirmTopUp()}
        onCancel={() => {
          if (payLoading) return;
          setShowTopUpDialog(false);
          setWalletPreview(null);
          setTopUpError(null);
        }}
      />
      <PTIntroScreen
        testName={testName}
        timeMinutes={timeMinutes}
        maxMarks={maxMarks}
        passPercentage={passPercentage}
        attemptsLeft={attemptsLeft}
        ptFeeMessage={ptFeeMessage}
        paymentRequired={paymentRequired}
        amountDueInr={ptFeeInfo?.amountDueInr}
        payLoading={payLoading}
        paymentError={paymentError}
        onPayFee={() => void handlePayFee()}
        context={context}
        onStart={handleStart}
        onTakeLater={isPostOnboardingPt ? onComplete : undefined}
      />
    </>
  );
};
