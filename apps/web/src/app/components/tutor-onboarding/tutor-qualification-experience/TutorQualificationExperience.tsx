import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  SAVE_TUTOR_QUALIFICATIONS,
  GET_MY_TUTOR_PROFILE,
} from '@tutorix/shared-graphql';
import {
  EducationalQualification,
  EDUCATIONAL_QUALIFICATION_LIST,
  EDUCATIONAL_QUALIFICATION_LABELS,
  GradeType,
  GRADE_TYPE_LIST,
  GRADE_TYPE_LABELS,
} from '@tutorix/shared-utils';
import type { StepComponentProps } from '../types';

interface QualificationRow {
  qualificationType: EducationalQualification;
  boardOrUniversity: string;
  gradeType: GradeType;
  gradeValue: string;
  yearObtained: string;
  fieldOfStudy: string;
}

const currentYear = new Date().getFullYear();

export const TutorQualificationExperience: React.FC<StepComponentProps> = ({
  onComplete,
  onBack,
}) => {
  const [qualifications, setQualifications] = useState<QualificationRow[]>(() => [
    {
      qualificationType: EducationalQualification.HIGHER_SECONDARY,
      boardOrUniversity: '',
      gradeType: GradeType.PERCENTAGE,
      gradeValue: '',
      yearObtained: '',
      fieldOfStudy: '',
    },
  ]);
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof QualificationRow, string>>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: profileData } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const list = profileData?.myTutorProfile?.qualifications;
    if (!list?.length) return;
    setQualifications(
      list.map((q: { qualificationType: string; boardOrUniversity: string; gradeType: string; gradeValue: string; yearObtained: number; fieldOfStudy?: string | null }) => ({
        qualificationType: q.qualificationType as EducationalQualification,
        boardOrUniversity: q.boardOrUniversity ?? '',
        gradeType: q.gradeType as GradeType,
        gradeValue: String(q.gradeValue ?? ''),
        yearObtained: q.yearObtained != null ? String(q.yearObtained) : '',
        fieldOfStudy: q.fieldOfStudy ?? '',
      }))
    );
  }, [profileData?.myTutorProfile?.qualifications]);

  const [saveQualifications, { loading: isSubmitting }] = useMutation(
    SAVE_TUTOR_QUALIFICATIONS,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
      update: (cache, { data }) => {
        if (!data?.saveTutorQualifications) return;
        try {
          const existing = cache.readQuery<{
            myTutorProfile?: { id: number; certificationStage?: string };
          }>({ query: GET_MY_TUTOR_PROFILE });
          if (existing?.myTutorProfile) {
            cache.writeQuery({
              query: GET_MY_TUTOR_PROFILE,
              data: {
                myTutorProfile: {
                  ...existing.myTutorProfile,
                  certificationStage: 'offerings',
                },
              },
            });
          }
        } catch {
          /* ignore */
        }
      },
      onCompleted: () => onComplete(),
      onError: (error) => {
        setSubmitError(
          error.graphQLErrors?.[0]?.message ||
            error.message ||
            'Failed to save qualifications. Please try again.'
        );
      },
    }
  );

  const updateRow = useCallback((index: number, updates: Partial<QualificationRow>) => {
    setQualifications((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    );
    setErrors((prev) => {
      const next = { ...prev };
      const rowErrors = next[index];
      if (rowErrors) {
        const keys = Object.keys(updates) as (keyof QualificationRow)[];
        keys.forEach((k) => delete rowErrors[k]);
        if (Object.keys(rowErrors).length === 0) delete next[index];
      }
      return next;
    });
  }, []);

  const addQualification = useCallback((type: EducationalQualification) => {
    setQualifications((prev) => [
      ...prev,
      {
        qualificationType: type,
        boardOrUniversity: '',
        gradeType: GradeType.PERCENTAGE,
        gradeValue: '',
        yearObtained: '',
        fieldOfStudy: '',
      },
    ]);
  }, []);

  const removeQualification = useCallback((index: number) => {
    const row = qualifications[index];
    if (row?.qualificationType === EducationalQualification.HIGHER_SECONDARY) return;
    setQualifications((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, [qualifications]);

  const usedTypes = qualifications.map((q) => q.qualificationType);
  const availableToAdd = EDUCATIONAL_QUALIFICATION_LIST.filter(
    (t) => t !== EducationalQualification.HIGHER_SECONDARY && !usedTypes.includes(t)
  );

  const validate = useCallback((): boolean => {
    setFormError(null);
    const next: Record<number, Partial<Record<keyof QualificationRow, string>>> = {};
    let valid = true;
    const hasHigherSecondary = qualifications.some(
      (q) => q.qualificationType === EducationalQualification.HIGHER_SECONDARY
    );
    if (!hasHigherSecondary) {
      setFormError('At least one qualification must be Higher Secondary.');
      valid = false;
    }
    qualifications.forEach((row, index) => {
      const e: Partial<Record<keyof QualificationRow, string>> = {};
      if (!row.boardOrUniversity.trim()) e.boardOrUniversity = 'Required';
      if (!row.gradeValue.trim()) e.gradeValue = 'Required';
      const year = parseInt(row.yearObtained, 10);
      if (!row.yearObtained.trim()) e.yearObtained = 'Required';
      else if (Number.isNaN(year) || year < 1950 || year > currentYear)
        e.yearObtained = `Enter a year between 1950 and ${currentYear}`;
      if (Object.keys(e).length) {
        next[index] = { ...next[index], ...e };
        valid = false;
      }
    });
    setErrors(next);
    return valid;
  }, [qualifications]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const onlyHigherSecondary =
      qualifications.length === 1 &&
      qualifications[0].qualificationType === EducationalQualification.HIGHER_SECONDARY;
    if (onlyHigherSecondary) {
      const confirmed = window.confirm(
        'Are you sure you want to go ahead without entering any additional qualifications?'
      );
      if (!confirmed) return;
    }

    saveQualifications({
      variables: {
        input: {
          qualifications: qualifications.map((row, index) => ({
            qualificationType: row.qualificationType,
            boardOrUniversity: row.boardOrUniversity.trim(),
            gradeType: row.gradeType,
            gradeValue: row.gradeValue.trim(),
            yearObtained: parseInt(row.yearObtained, 10),
            fieldOfStudy: row.fieldOfStudy.trim() || undefined,
            displayOrder: index,
          })),
        },
      },
    });
  };

  const inputCls = (hasError: boolean) =>
    `h-11 w-full rounded-md border bg-white px-3 text-primary shadow-sm focus:outline-none focus:border-primary ${
      hasError ? 'border-danger' : 'border-subtle'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted">
          Add your educational qualifications. Higher Secondary is required. You can add more (e.g. Bachelors, Masters) below.
        </p>
        <p className="text-sm text-muted italic font-bold">
          Please be truthful. Later, you will be required to upload qualification documents for verification.
        </p>
      </div>

      {qualifications.map((row, index) => (
        <div
          key={`${row.qualificationType}-${index}`}
          className="rounded-xl border border-subtle bg-gray-50/50 p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-primary">
              {EDUCATIONAL_QUALIFICATION_LABELS[row.qualificationType]}
              {row.qualificationType === EducationalQualification.HIGHER_SECONDARY && (
                <span className="ml-2 text-xs font-normal text-muted">(Required)</span>
              )}
            </h3>
            {row.qualificationType !== EducationalQualification.HIGHER_SECONDARY && (
              <button
                type="button"
                onClick={() => removeQualification(index)}
                className="text-sm font-medium text-danger hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium text-primary">
                Board / University <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={row.boardOrUniversity}
                onChange={(e) => updateRow(index, { boardOrUniversity: e.target.value })}
                className={inputCls(!!errors[index]?.boardOrUniversity)}
                placeholder="e.g. CBSE, University of Delhi"
              />
              {errors[index]?.boardOrUniversity && (
                <p className="text-xs text-danger">{errors[index].boardOrUniversity}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                Grade type <span className="text-danger">*</span>
              </label>
              <select
                value={row.gradeType}
                onChange={(e) => updateRow(index, { gradeType: e.target.value as GradeType })}
                className={inputCls(false)}
              >
                {GRADE_TYPE_LIST.map((t) => (
                  <option key={t} value={t}>
                    {GRADE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                Grade value <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={row.gradeValue}
                onChange={(e) => updateRow(index, { gradeValue: e.target.value })}
                className={inputCls(!!errors[index]?.gradeValue)}
                placeholder={row.gradeType === GradeType.CGPA ? 'e.g. 8.5' : row.gradeType === GradeType.PERCENTAGE ? 'e.g. 85' : 'e.g. First Division'}
              />
              {errors[index]?.gradeValue && (
                <p className="text-xs text-danger">{errors[index].gradeValue}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                Year obtained <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min={1950}
                max={currentYear}
                value={row.yearObtained}
                onChange={(e) => updateRow(index, { yearObtained: e.target.value })}
                className={inputCls(!!errors[index]?.yearObtained)}
                placeholder={String(currentYear)}
              />
              {errors[index]?.yearObtained && (
                <p className="text-xs text-danger">{errors[index].yearObtained}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">Field of study</label>
              <input
                type="text"
                value={row.fieldOfStudy}
                onChange={(e) => updateRow(index, { fieldOfStudy: e.target.value })}
                className={inputCls(false)}
                placeholder="e.g. Science, Mathematics"
              />
            </div>
          </div>
        </div>
      ))}

      {availableToAdd.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-primary">Add qualification:</span>
          {availableToAdd.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addQualification(type)}
              className="rounded-lg border border-subtle bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm transition hover:border-primary hover:bg-gray-50"
            >
              + {EDUCATIONAL_QUALIFICATION_LABELS[type]}
            </button>
          ))}
        </div>
      )}

      {(formError || submitError) && (
        <div className="rounded-lg border border-danger bg-red-50 p-3 text-sm text-danger">
          {formError || submitError}
        </div>
      )}

      <div className="flex justify-end gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="h-11 rounded-lg border border-subtle px-6 text-sm font-semibold text-primary shadow-sm transition hover:border-primary"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </form>
  );
};
