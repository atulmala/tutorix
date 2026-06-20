import React from 'react';

const DEFAULT_TIME_MINUTES = 30;
const DEFAULT_MAX_MARKS = 30;
const DEFAULT_PASS_PERCENTAGE = 65;

type PTIntroScreenProps = {
  testName?: string;
  timeMinutes?: number;
  maxMarks?: number;
  passPercentage?: number;
  attemptsLeft?: number;
  ptFeeMessage?: string | null;
  paymentRequired?: boolean;
  amountDueInr?: number;
  payLoading?: boolean;
  paymentError?: string | null;
  onPayFee?: () => void;
  context?: 'onboarding' | 'addOffering' | 'profile';
  onStart: () => void;
  onTakeLater?: () => void;
};

export const PTIntroScreen: React.FC<PTIntroScreenProps> = ({
  testName = 'this test',
  timeMinutes = DEFAULT_TIME_MINUTES,
  maxMarks = DEFAULT_MAX_MARKS,
  passPercentage = DEFAULT_PASS_PERCENTAGE,
  attemptsLeft = 2,
  ptFeeMessage,
  paymentRequired = false,
  amountDueInr,
  payLoading = false,
  paymentError,
  onPayFee,
  context = 'onboarding',
  onStart,
  onTakeLater,
}) => {
  const passingMarks = Math.ceil((passPercentage / 100) * maxMarks);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-primary">
          Proficiency Test
        </h2>
        <p className="text-sm text-muted">
          You are about to start the proficiency test for {testName}.
        </p>

        <div className="rounded-lg border border-subtle bg-gray-50/80 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Duration</span>
            <span className="font-medium text-primary">
              {timeMinutes} minutes
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Attempts left</span>
            <span className="font-medium text-primary">{attemptsLeft}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Max marks</span>
            <span className="font-medium text-primary">{maxMarks}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Passing marks</span>
            <span className="font-medium text-primary">
              {passingMarks} ({passPercentage}%)
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Scoring</span>
            <span className="font-medium text-primary">
              1 mark per correct answer, no negative marking
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-sm text-amber-800">
            <strong>Important:</strong> Once the test starts, it cannot be
            stopped. Please ensure you have at least {timeMinutes} minutes of
            uninterrupted time before starting.
          </p>
        </div>

        {ptFeeMessage ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 space-y-2">
            <p className="text-sm text-amber-950">{ptFeeMessage}</p>
            {paymentRequired ? (
              <p className="text-sm text-amber-900">
                Pay the test fee before you can start the proficiency test.
              </p>
            ) : null}
          </div>
        ) : null}

        {paymentError ? (
          <p className="text-sm text-red-700" role="alert">
            {paymentError}
          </p>
        ) : null}

        {context === 'onboarding' ? (
          <div className="rounded-lg border border-subtle bg-gray-50/80 p-4">
            <p className="text-sm text-muted">
              You will be allowed to change subject if you are not able to pass
              this {testName} in 2 attempts. Also once your onboarding is complete,
              you will be allowed to add more offerings.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-subtle bg-gray-50/80 p-4">
            <p className="text-sm text-muted">
              You have up to 2 attempts to pass this test for this offering. After
              passing, set your rate card from your profile.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        {onTakeLater ? (
          <button
            type="button"
            onClick={onTakeLater}
            className="h-11 rounded-lg border border-subtle px-6 text-sm font-semibold text-primary transition hover:bg-gray-50"
          >
            Take later
          </button>
        ) : null}
        {paymentRequired && onPayFee ? (
          <button
            type="button"
            onClick={onPayFee}
            disabled={payLoading}
            className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:opacity-50"
          >
            {payLoading ? 'Processing…' : `Pay ₹${amountDueInr ?? ''}`}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onStart}
          disabled={paymentRequired || payLoading}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:opacity-50"
        >
          Start Test
        </button>
      </div>
    </div>
  );
};
