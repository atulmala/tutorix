import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  GET_ADMIN_PROFICIENCY_TEST_DETAIL,
  GET_ADMIN_PROFICIENCY_TESTS,
} from '@tutorix/shared-graphql';

type PtAnswerRow = {
  id: number;
  text: string;
  answer: boolean;
};

type PtQuestionRow = {
  id: number;
  question: string;
  questionType: string;
  difficulty: QuestionDifficulty;
  answers: PtAnswerRow[];
};

type AdminProficiencyTestDetailData = {
  adminProficiencyTestDetail: {
    id: number;
    name: string;
    time: number;
    score: number;
    passPercentage: number;
    questions: PtQuestionRow[];
  };
};

type AdminProficiencyTestsData = {
  adminProficiencyTests: Array<{
    id: number;
    studyArea: string;
    board: string;
    classLabel: string;
    subjects: string;
    questionCount: number;
  }>;
};

type QuestionDifficulty = number | string;

function normalizeDifficulty(
  difficulty: QuestionDifficulty,
): 'LOW' | 'MEDIUM' | 'HIGH' | null {
  if (typeof difficulty === 'number') {
    switch (difficulty) {
      case 1:
        return 'LOW';
      case 2:
        return 'MEDIUM';
      case 3:
        return 'HIGH';
      default:
        return null;
    }
  }

  const upper = difficulty.toUpperCase();
  if (upper === 'LOW' || upper === 'MEDIUM' || upper === 'HIGH') {
    return upper;
  }

  return null;
}

function difficultyLabel(difficulty: QuestionDifficulty): string {
  switch (normalizeDifficulty(difficulty)) {
    case 'LOW':
      return 'Low';
    case 'MEDIUM':
      return 'Medium';
    case 'HIGH':
      return 'High';
    default:
      return 'Unknown';
  }
}

function difficultyBadgeClass(difficulty: QuestionDifficulty): string {
  switch (normalizeDifficulty(difficulty)) {
    case 'LOW':
      return 'bg-sky-100 text-sky-800 ring-1 ring-sky-200';
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
    case 'HIGH':
      return 'bg-rose-100 text-rose-800 ring-1 ring-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  }
}

export function ProficiencyTestDetailPage() {
  const { testId } = useParams<{ testId: string }>();
  const parsedTestId = testId ? parseInt(testId, 10) : NaN;

  const { data, loading, error } = useQuery<AdminProficiencyTestDetailData>(
    GET_ADMIN_PROFICIENCY_TEST_DETAIL,
    {
      variables: { testId: parsedTestId },
      skip: Number.isNaN(parsedTestId),
    },
  );

  const { data: listData } = useQuery<AdminProficiencyTestsData>(
    GET_ADMIN_PROFICIENCY_TESTS,
    { skip: Number.isNaN(parsedTestId) },
  );

  const test = data?.adminProficiencyTestDetail;
  const listItem = listData?.adminProficiencyTests.find(
    (item) => item.id === parsedTestId,
  );
  const questions = test?.questions ?? [];

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/proficiency-tests"
          className="text-sm font-medium text-fuchsia-700 hover:text-fuchsia-900"
        >
          ← Back to proficiency tests
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-primary">
          Proficiency test #{parsedTestId}
        </h1>
        {test && (
          <p className="mt-1 text-sm text-muted">
            {test.name} · {questions.length} questions · {test.time} min · pass{' '}
            {test.passPercentage}%
          </p>
        )}
        {listItem && (
          <p className="mt-1 text-sm text-muted">
            {listItem.studyArea} · {listItem.board} · {listItem.classLabel} ·{' '}
            {listItem.subjects}
          </p>
        )}
      </div>

      {loading && (
        <p className="rounded-xl border border-fuchsia-200 bg-white p-6 text-sm text-muted shadow-md">
          Loading questions…
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-600 shadow-md" role="alert">
          Could not load proficiency test. Please try again.
        </p>
      )}

      {!loading && !error && test && questions.length === 0 && (
        <p className="rounded-xl border border-fuchsia-200 bg-white p-6 text-sm text-muted shadow-md">
          This proficiency test has no questions.
        </p>
      )}

      {!loading && !error && questions.length > 0 && (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <article
              key={question.id}
              className="overflow-hidden rounded-xl border border-fuchsia-200 bg-white shadow-md"
            >
              <div className="border-b border-fuchsia-100 bg-gradient-to-r from-fuchsia-50/80 to-violet-50/50 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-fuchsia-900">
                    Question {index + 1}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${difficultyBadgeClass(question.difficulty)}`}
                  >
                    {difficultyLabel(question.difficulty)}
                  </span>
                  <span className="text-xs text-muted">ID {question.id}</span>
                </div>
              </div>

              <div className="space-y-4 px-5 py-4">
                <div
                  className="text-sm font-medium text-primary [&_img]:max-h-48 [&_img]:rounded [&_p]:m-0"
                  dangerouslySetInnerHTML={{ __html: question.question }}
                />

                <div className="space-y-2">
                  {question.answers.map((option) => (
                    <div
                      key={option.id}
                      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                        option.answer
                          ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200'
                          : 'border-subtle bg-white'
                      }`}
                    >
                      <span
                        className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          option.answer
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-muted'
                        }`}
                      >
                        {option.answer ? 'Correct' : 'Option'}
                      </span>
                      <span
                        className="text-sm text-primary [&_p]:m-0 [&_p]:inline"
                        dangerouslySetInnerHTML={{ __html: option.text }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
