import React, { useEffect, useState } from 'react';
import {
  SCHOOL_BOARD_OPTIONS,
  SCHOOL_CLASS_OPTIONS,
  STUDENT_TYPE_OPTIONS,
} from '@tutorix/shared-utils';
import type { EducationFormValues, StudentDetailRecord } from './types';

type EducationModalProps = {
  open: boolean;
  initialValues?: StudentDetailRecord | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: EducationFormValues) => void;
};

type StudentType = EducationFormValues['studentType'];
type Board = NonNullable<EducationFormValues['board']>;

function toForm(student?: StudentDetailRecord | null): {
  studentType: StudentType;
  schoolClass: number | '';
  board: Board | '';
  boardOther: string;
} {
  if (!student?.studentType) {
    return { studentType: 'SCHOOL', schoolClass: '', board: '', boardOther: '' };
  }
  const studentType = student.studentType as StudentType;
  return {
    studentType,
    schoolClass: student.schoolClass ?? '',
    board: (student.board as Board | undefined) ?? '',
    boardOther: student.boardOther?.trim() ?? '',
  };
}

export function EducationModal({
  open,
  initialValues,
  saving = false,
  error,
  onClose,
  onSubmit,
}: EducationModalProps) {
  const [studentType, setStudentType] = useState<StudentType>('SCHOOL');
  const [schoolClass, setSchoolClass] = useState<number | ''>('');
  const [board, setBoard] = useState<Board | ''>('');
  const [boardOther, setBoardOther] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const form = toForm(initialValues);
    setStudentType(form.studentType);
    setSchoolClass(form.schoolClass);
    setBoard(form.board);
    setBoardOther(form.boardOther);
    setValidationError(null);
  }, [open, initialValues]);

  const handleSubmit = () => {
    if (studentType === 'SCHOOL') {
      if (!schoolClass) {
        setValidationError('Please select your class');
        return;
      }
      if (!board) {
        setValidationError('Please select your board');
        return;
      }
      if (board === 'OTHER' && !boardOther.trim()) {
        setValidationError('Please specify your board');
        return;
      }
    }

    setValidationError(null);
    onSubmit({
      studentType,
      schoolClass:
        studentType === 'SCHOOL' && schoolClass !== '' ? schoolClass : undefined,
      board: studentType === 'SCHOOL' && board !== '' ? board : undefined,
      boardOther:
        studentType === 'SCHOOL' && board === 'OTHER' ? boardOther.trim() : undefined,
    });
  };

  const displayError = validationError ?? error;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="education-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 id="education-modal-title" className="text-xl font-semibold text-primary">
            Education
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition hover:text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
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
                <div className="space-y-1 text-left">
                  <label htmlFor="school-class" className="text-sm font-medium text-primary">
                    Class <span className="text-danger">*</span>
                  </label>
                  <select
                    id="school-class"
                    value={schoolClass}
                    onChange={(e) =>
                      setSchoolClass(e.target.value ? parseInt(e.target.value, 10) : '')
                    }
                    className="w-full rounded-md border border-subtle bg-white px-md py-sm text-primary shadow-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Select class</option>
                    {SCHOOL_CLASS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label htmlFor="school-board" className="text-sm font-medium text-primary">
                    Board <span className="text-danger">*</span>
                  </label>
                  <select
                    id="school-board"
                    value={board}
                    onChange={(e) => setBoard(e.target.value as Board | '')}
                    className="w-full rounded-md border border-subtle bg-white px-md py-sm text-primary shadow-sm focus:border-primary focus:outline-none"
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
                <div className="space-y-1 text-left">
                  <label htmlFor="board-other" className="text-sm font-medium text-primary">
                    Board name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="board-other"
                    type="text"
                    value={boardOther}
                    onChange={(e) => setBoardOther(e.target.value)}
                    className="w-full rounded-md border border-subtle bg-white px-md py-sm text-primary shadow-sm focus:border-primary focus:outline-none"
                    placeholder="Enter board name"
                  />
                </div>
              )}
            </>
          )}

          {displayError ? (
            <p className="text-sm text-red-600" role="alert">
              {displayError}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-subtle px-4 py-2 text-sm font-medium text-primary transition hover:bg-subtle"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
