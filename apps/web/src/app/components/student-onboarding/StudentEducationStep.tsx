import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  GET_MY_STUDENT_PROFILE,
  SAVE_STUDENT_EDUCATION,
} from '@tutorix/shared-graphql';
import {
  SCHOOL_BOARD_OPTIONS,
  SCHOOL_CLASS_OPTIONS,
  STUDENT_TYPE_OPTIONS,
} from '@tutorix/shared-utils';
import type { StudentStepComponentProps } from './types';

const inputCls = (hasError = false) =>
  `h-11 w-full rounded-lg border px-3 text-sm text-primary outline-none transition focus:ring-2 focus:ring-primary/30 ${
    hasError ? 'border-danger' : 'border-subtle'
  }`;

type StudentType = 'SCHOOL' | 'COLLEGE' | 'NOT_STUDYING' | 'COMPLETED';
type Board = 'CBSE' | 'ICSE' | 'IB' | 'OTHER';

export const StudentEducationStep: React.FC<StudentStepComponentProps> = ({
  onComplete,
}) => {
  const [studentType, setStudentType] = useState<StudentType>('SCHOOL');
  const [schoolClass, setSchoolClass] = useState<number | ''>('');
  const [board, setBoard] = useState<Board | ''>('');
  const [boardOther, setBoardOther] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [saveEducation, { loading }] = useMutation(SAVE_STUDENT_EDUCATION, {
    refetchQueries: [{ query: GET_MY_STUDENT_PROFILE }],
    awaitRefetchQueries: true,
    onCompleted: () => onComplete(),
    onError: (err) => {
      setError(
        err.graphQLErrors?.[0]?.message ||
          err.message ||
          'Failed to save. Please try again.',
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (studentType === 'SCHOOL') {
      if (!schoolClass) {
        setError('Please select your class');
        return;
      }
      if (!board) {
        setError('Please select your board');
        return;
      }
      if (board === 'OTHER' && !boardOther.trim()) {
        setError('Please specify your board');
        return;
      }
    }

    await saveEducation({
      variables: {
        input: {
          studentType,
          schoolClass: studentType === 'SCHOOL' ? schoolClass : undefined,
          board: studentType === 'SCHOOL' ? board : undefined,
          boardOther:
            studentType === 'SCHOOL' && board === 'OTHER'
              ? boardOther.trim()
              : undefined,
        },
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <span className="text-sm font-medium text-primary">
          I am a <span className="text-danger">*</span>
        </span>
        <div className="grid gap-2 sm:grid-cols-2">
          {STUDENT_TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                studentType === opt.value
                  ? 'border-[#5fa8ff] bg-[#5fa8ff]/5'
                  : 'border-subtle'
              }`}
            >
              <input
                type="radio"
                name="studentType"
                value={opt.value}
                checked={studentType === opt.value}
                onChange={() => setStudentType(opt.value as StudentType)}
                className="h-4 w-4 accent-[#5fa8ff]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {studentType === 'SCHOOL' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                Class <span className="text-danger">*</span>
              </label>
              <select
                value={schoolClass}
                onChange={(e) =>
                  setSchoolClass(e.target.value ? parseInt(e.target.value, 10) : '')
                }
                className={inputCls()}
              >
                <option value="">Select class</option>
                {SCHOOL_CLASS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                Board <span className="text-danger">*</span>
              </label>
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value as Board | '')}
                className={inputCls()}
              >
                <option value="">Select board</option>
                {SCHOOL_BOARD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {board === 'OTHER' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                Board name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={boardOther}
                onChange={(e) => setBoardOther(e.target.value)}
                className={inputCls()}
                placeholder="Enter board name"
              />
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
        >
          {loading ? 'Saving...' : 'Complete onboarding'}
        </button>
      </div>
    </form>
  );
};
