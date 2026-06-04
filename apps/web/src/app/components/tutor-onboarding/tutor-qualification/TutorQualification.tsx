import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  SAVE_TUTOR_QUALIFICATIONS,
  GET_MY_TUTOR_PROFILE,
} from '@tutorix/shared-graphql';
import {
  EducationalQualification,
  EDUCATIONAL_QUALIFICATION_LABELS,
  GradeType,
  GRADE_TYPE_LIST,
  GRADE_TYPE_LABELS,
  buildQualificationMutationInput,
  emptyQualificationRow,
  getAvailableQualificationTypes,
  getQualificationDegreeLabel,
  getQualificationDegreePlaceholder,
  getQualificationFieldOfStudyPlaceholder,
  getQualificationGradeValuePlaceholder,
  mapQualificationToFormRow,
  validateQualificationList,
  validateQualificationRow,
  type QualificationFormRow,
  type QualificationRowFieldErrors,
} from '@tutorix/shared-utils';
import type { StepComponentProps } from '../types';

type MyTutorProfileQualification = Parameters<typeof mapQualificationToFormRow>[0];

type MyTutorProfileData = {
  myTutorProfile?: {
    qualifications?: MyTutorProfileQualification[];
  };
};

const currentYear = new Date().getFullYear();

export const TutorQualification: React.FC<StepComponentProps> = ({
  onComplete,
}) => {
  const [qualifications, setQualifications] = useState<QualificationFormRow[]>(() => [
    emptyQualificationRow(EducationalQualification.HIGHER_SECONDARY),
  ]);
  const [errors, setErrors] = useState<
    Record<number, QualificationRowFieldErrors>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savingSectionIndex, setSavingSectionIndex] = useState<number | null>(null);
  const [savedQualificationTypes, setSavedQualificationTypes] = useState<Set<EducationalQualification>>(
    () => new Set()
  );

  const { data: profileData } = useQuery<MyTutorProfileData>(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const list = profileData?.myTutorProfile?.qualifications;
    if (list?.length) {
      setSavedQualificationTypes(
        new Set(list.map((q) => q.qualificationType as EducationalQualification))
      );
    }
    if (!list?.length) return;
    setQualifications(list.map((q) => mapQualificationToFormRow(q)));
  }, [profileData?.myTutorProfile?.qualifications]);

  const [saveQualifications, { loading: isSubmitting }] = useMutation(
    SAVE_TUTOR_QUALIFICATIONS,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
      update: (cache, { data }, { variables }) => {
        if (!data?.saveTutorQualifications) return;
        const advanceToNextStep = variables?.input?.advanceToNextStep !== false;
        if (!advanceToNextStep) {
          // Per-section Save: explicitly keep certificationStage at 'qualification'.
          // Qualification step must not show as complete until Continue is pressed.
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
                    certificationStage: 'qualification',
                  },
                },
              });
            }
          } catch {
            /* ignore */
          }
          return;
        }
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
                  certificationStage: 'experience',
                },
              },
            });
          }
        } catch {
          /* ignore */
        }
      },
      onCompleted: () => {
        // Don't call onComplete - refetch updates profileData, useEffect in
        // TutorOnboarding syncs currentStepIndex from certificationStage.
        // Calling onComplete would double-advance and skip the next step.
      },
      onError: (error) => {
        setSubmitError(
          error.graphQLErrors?.[0]?.message ||
            error.message ||
            'Failed to save qualifications. Please try again.'
        );
      },
    }
  );

  const updateRow = useCallback((index: number, updates: Partial<QualificationFormRow>) => {
    setQualifications((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    );
    setErrors((prev) => {
      const next = { ...prev };
      const rowErrors = next[index];
      if (rowErrors) {
        const keys = Object.keys(updates) as (keyof QualificationFormRow)[];
        keys.forEach((k) => delete rowErrors[k]);
        if (Object.keys(rowErrors).length === 0) delete next[index];
      }
      return next;
    });
  }, []);

  const addQualification = useCallback((type: EducationalQualification) => {
    setQualifications((prev) => [...prev, emptyQualificationRow(type)]);
  }, []);

  const handleDeleteSection = useCallback(
    (index: number) => {
      const row = qualifications[index];
      if (!row || row.qualificationType === EducationalQualification.HIGHER_SECONDARY) return;
      const label = EDUCATIONAL_QUALIFICATION_LABELS[row.qualificationType];
      if (!window.confirm(`Are you sure you want to delete ${label}?`)) return;
      const updated = qualifications.filter((_, i) => i !== index);
      setQualifications(updated);
      setSavedQualificationTypes((prev) => {
        const next = new Set(prev);
        next.delete(row.qualificationType);
        return next;
      });
      setErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      saveQualifications({
        variables: {
          input: {
            qualifications: buildQualificationMutationInput(updated),
            advanceToNextStep: false,
          },
        },
      });
    },
    [qualifications, saveQualifications]
  );

  const availableToAdd = getAvailableQualificationTypes(
    qualifications.map((q) => q.qualificationType),
  );

  const validateRow = useCallback(
    (index: number): boolean => {
      setFormError(null);
      const row = qualifications[index];
      if (!row) return false;
      const result = validateQualificationRow(row);
      if (result.ok === false) {
        setErrors((prev) => ({ ...prev, [index]: result.fieldErrors }));
        return false;
      }
      setErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return true;
    },
    [qualifications]
  );

  const validate = useCallback((): boolean => {
    setFormError(null);
    const listResult = validateQualificationList(qualifications);
    if (listResult.ok === false) {
      setFormError(listResult.message);
    }
    const next: Record<number, QualificationRowFieldErrors> = {};
    let valid = listResult.ok;
    qualifications.forEach((row, index) => {
      const result = validateQualificationRow(row);
      if (result.ok === false) {
        next[index] = result.fieldErrors;
        valid = false;
      }
    });
    setErrors(next);
    return valid;
  }, [qualifications]);

  const handleSaveSection = (index: number) => {
    setSubmitError(null);
    if (!validateRow(index)) return;
    setSavingSectionIndex(index);
    saveQualifications({
      variables: {
        input: {
          qualifications: buildQualificationMutationInput(qualifications),
          advanceToNextStep: false,
        },
      },
    })
      .then(() => {
        const row = qualifications[index];
        if (row) {
          setSavedQualificationTypes((prev) => new Set(prev).add(row.qualificationType));
        }
      })
      .finally(() => setSavingSectionIndex(null));
  };

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
          qualifications: buildQualificationMutationInput(qualifications),
          advanceToNextStep: true,
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

      {qualifications.map((row, index) => {
        const isHigherSecondary =
          row.qualificationType === EducationalQualification.HIGHER_SECONDARY;

        return (
        <div
          key={`${row.qualificationType}-${index}`}
          className="rounded-xl border border-subtle bg-gray-50/50 p-5"
        >
          <div className="mb-4">
            <h3 className="text-base font-semibold text-primary">
              {EDUCATIONAL_QUALIFICATION_LABELS[row.qualificationType]}
              {row.qualificationType === EducationalQualification.HIGHER_SECONDARY && (
                <span className="ml-2 text-xs font-normal text-muted">(Required)</span>
              )}
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                {getQualificationDegreeLabel(row.qualificationType)}
                {!isHigherSecondary && <span className="text-danger"> *</span>}
              </label>
              <input
                type="text"
                value={row.degreeName}
                onChange={(e) => updateRow(index, { degreeName: e.target.value })}
                className={inputCls(!isHigherSecondary && !!errors[index]?.degreeName)}
                placeholder={getQualificationDegreePlaceholder(row.qualificationType)}
                disabled={isHigherSecondary}
              />
              {!isHigherSecondary && errors[index]?.degreeName && (
                <p className="text-xs text-danger">{errors[index].degreeName}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                Specialization <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={row.fieldOfStudy}
                onChange={(e) => updateRow(index, { fieldOfStudy: e.target.value })}
                className={inputCls(!!errors[index]?.fieldOfStudy)}
                placeholder={getQualificationFieldOfStudyPlaceholder(row.qualificationType)}
              />
              {errors[index]?.fieldOfStudy && (
                <p className="text-xs text-danger">{errors[index].fieldOfStudy}</p>
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

            <div className="space-y-1 sm:col-span-3">
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
                placeholder={getQualificationGradeValuePlaceholder(row.gradeType)}
              />
              {errors[index]?.gradeValue && (
                <p className="text-xs text-danger">{errors[index].gradeValue}</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => handleSaveSection(index)}
              disabled={isSubmitting}
              className="h-10 rounded-lg border border-subtle bg-white px-4 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSectionIndex === index ? 'Saving...' : 'Save'}
            </button>
            {row.qualificationType !== EducationalQualification.HIGHER_SECONDARY && (
              <button
                type="button"
                onClick={() => handleDeleteSection(index)}
                disabled={!savedQualificationTypes.has(row.qualificationType) || isSubmitting}
                className="h-10 rounded-lg border border-danger bg-white px-4 text-sm font-semibold text-danger shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:border-gray-200 disabled:text-gray-400"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      );
      })}

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

      <div className="flex justify-end">
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
