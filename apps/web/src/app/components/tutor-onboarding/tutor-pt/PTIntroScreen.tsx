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
  onStart: () => void;
};

export const PTIntroScreen: React.FC<PTIntroScreenProps> = ({
  testName = 'this test',
  timeMinutes = DEFAULT_TIME_MINUTES,
  maxMarks = DEFAULT_MAX_MARKS,
  passPercentage = DEFAULT_PASS_PERCENTAGE,
  attemptsLeft = 2,
  onStart,
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

        <div className="rounded-lg border border-subtle bg-gray-50/80 p-4">
          <p className="text-sm text-muted">
            You will be allowed to change subject if you are not able to pass
            this {testName} in 2 attempts. Also once your onboarding is complete,
            you will be allowed to add more offerings.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onStart}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
        >
          Start Test
        </button>
      </div>
    </div>
  );
};
