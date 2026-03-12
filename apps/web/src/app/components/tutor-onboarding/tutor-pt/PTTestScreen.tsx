import React, { useCallback, useEffect, useRef, useState } from 'react';

type Answer = { id: number; text: string };
type Question = {
  id: number;
  question: string;
  questionType: string;
  difficulty: number;
  answers: Answer[];
};

type PTTestScreenProps = {
  questions: Question[];
  /** Test duration in minutes (from proficiency_test.time) */
  timeMinutes?: number;
  onFinish: (
    answers: { questionId: number; answerId: number }[],
    timeTakenSeconds: number
  ) => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const DEFAULT_TIME_MINUTES = 30;

export const PTTestScreen: React.FC<PTTestScreenProps> = ({
  questions,
  timeMinutes = DEFAULT_TIME_MINUTES,
  onFinish,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const durationSec = (timeMinutes || DEFAULT_TIME_MINUTES) * 60;
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  const currentQuestion = questions[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;

  const submitTest = useCallback(() => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const answers = Object.entries(selectedAnswers).map(([qId, aId]) => ({
      questionId: parseInt(qId, 10),
      answerId: aId,
    }));
    const timeTakenSeconds = Math.round(
      (Date.now() - startTimeRef.current) / 1000
    );
    onFinish(answers, timeTakenSeconds);
  }, [selectedAnswers, onFinish, isSubmitting]);

  useEffect(() => {
    if (timeLeft <= 0) {
      submitTest();
      return;
    }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, submitTest]);

  const handleSelectAnswer = (answerId: number) => {
    if (!currentQuestion) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answerId,
    }));
  };

  const handleNext = () => {
    if (isLast) {
      submitTest();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentIndex((i) => i - 1);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="text-sm text-muted">No questions available.</div>
    );
  }

  const selectedId = selectedAnswers[currentQuestion.id];
  const canProceed = selectedId != null;

  return (
    <div className="space-y-6">
      {/* Timer */}
      <div className="flex items-center justify-between rounded-lg border border-subtle bg-gray-50/80 px-4 py-3">
        <span className="text-sm text-muted">Time remaining</span>
        <span
          className={`text-lg font-mono font-semibold ${
            timeLeft <= 300 ? 'text-danger' : 'text-primary'
          }`}
        >
          {formatTime(timeLeft)}
        </span>
      </div>

      {/* Question progress */}
      <div className="text-sm text-muted">
        Question {currentIndex + 1} of {questions.length}
      </div>

      {/* Question */}
      <div className="space-y-4">
        <p
          className="text-base font-medium text-primary"
          dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
        />
        <div className="space-y-2">
          {currentQuestion.answers?.map((a) => (
            <label
              key={a.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                selectedId === a.id
                  ? 'border-[#5fa8ff] bg-[#5fa8ff]/5'
                  : 'border-subtle hover:border-primary/50'
              }`}
            >
              <input
                type="radio"
                name={`q-${currentQuestion.id}`}
                value={a.id}
                checked={selectedId === a.id}
                onChange={() => handleSelectAnswer(a.id)}
                className="h-4 w-4"
              />
              <span
                className="text-sm [&_p]:m-0 [&_p]:inline"
                dangerouslySetInnerHTML={{ __html: a.text }}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end gap-3 pt-4">
        <div className="flex gap-3">
          {!isFirst && (
            <button
              type="button"
              onClick={handleBack}
              className="h-11 rounded-lg border border-subtle px-6 text-sm font-semibold text-primary shadow-sm transition hover:border-primary"
            >
              Previous
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
          >
            {isSubmitting
              ? 'Submitting...'
              : isLast
                ? 'Finish'
                : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
