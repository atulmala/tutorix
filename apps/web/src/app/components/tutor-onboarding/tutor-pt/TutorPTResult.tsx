import React from 'react';
import {
  PENDING_RATE_CARD_TASK_ACTION,
  PT_PASSED_RATE_CARD_LATER_ACTION,
  ptPassResultMessage,
} from '@tutorix/shared-utils';

export type TutorPTResultProps = {
  passed: boolean;
  score: number;
  maxScore: number;
  passPercentage?: number;
  attemptsUsed: number;
  isPostOnboardingPt: boolean;
  onContinue: () => void;
  onSetRateCard?: () => void;
  onRetry: () => void;
  onExhaustedContinue?: () => void;
};

export const TutorPTResult: React.FC<TutorPTResultProps> = ({
  passed,
  score,
  maxScore,
  passPercentage,
  attemptsUsed,
  isPostOnboardingPt,
  onContinue,
  onSetRateCard,
  onRetry,
  onExhaustedContinue,
}) => {
  const hasMoreAttempts = attemptsUsed < 2;
  const primaryClassName =
    'h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]';
  const secondaryClassName =
    'h-11 rounded-lg border border-subtle px-6 text-sm font-semibold text-primary transition hover:bg-gray-50';

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
          Score: {score} / {maxScore}
        </p>
        {passPercentage != null && (
          <p className="text-sm text-muted">
            Passing marks: {Math.ceil((passPercentage / 100) * maxScore)} ({passPercentage}%)
          </p>
        )}
        <p className="text-sm text-muted">Attempts used: {attemptsUsed} / 2</p>
      </div>
      <p className="text-sm text-muted">
        {passed
          ? ptPassResultMessage(isPostOnboardingPt)
          : hasMoreAttempts
            ? 'You have one more attempt. Click Retry to try again.'
            : isPostOnboardingPt
              ? 'Return to your profile to try another offering later.'
              : 'Please select another offering to continue.'}
      </p>
      <div className="flex justify-end gap-3">
        {passed ? (
          <>
            {isPostOnboardingPt ? (
              <button type="button" onClick={onContinue} className={secondaryClassName}>
                {PT_PASSED_RATE_CARD_LATER_ACTION}
              </button>
            ) : null}
            <button
              type="button"
              onClick={isPostOnboardingPt && onSetRateCard ? onSetRateCard : onContinue}
              className={primaryClassName}
            >
              {isPostOnboardingPt ? PENDING_RATE_CARD_TASK_ACTION : 'Continue'}
            </button>
          </>
        ) : hasMoreAttempts ? (
          <button type="button" onClick={onRetry} className={primaryClassName}>
            Retry
          </button>
        ) : onExhaustedContinue ? (
          <button type="button" onClick={onExhaustedContinue} className={primaryClassName}>
            {isPostOnboardingPt ? 'Back to profile' : 'Continue'}
          </button>
        ) : null}
      </div>
    </div>
  );
};
