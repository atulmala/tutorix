import React from 'react';
import {
  DIVISION_GRADE_VALUES,
  GradeType,
  getQualificationGradeValuePlaceholder,
} from '@tutorix/shared-utils';

type QualificationGradeValueFieldProps = {
  gradeType: GradeType;
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
  inputClassName: (hasError: boolean) => string;
};

export function QualificationGradeValueField({
  gradeType,
  value,
  onChange,
  hasError = false,
  disabled = false,
  inputClassName,
}: QualificationGradeValueFieldProps) {
  if (gradeType === GradeType.DIVISION) {
    return (
      <div
        className={`flex flex-wrap gap-3 ${hasError ? 'rounded-md ring-1 ring-danger' : ''}`}
        role="radiogroup"
        aria-label="Division"
      >
        {DIVISION_GRADE_VALUES.map((division) => {
          const selected = value === division;
          return (
            <label
              key={division}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                selected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-subtle bg-white text-primary hover:border-primary/40'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="division-grade"
                value={division}
                checked={selected}
                onChange={() => onChange(division)}
                disabled={disabled}
                className="sr-only"
              />
              {division}
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClassName(hasError)}
      placeholder={getQualificationGradeValuePlaceholder(gradeType)}
      disabled={disabled}
    />
  );
}
