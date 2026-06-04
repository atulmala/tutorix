import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  SAVE_TUTOR_EXPERIENCES,
  GET_MY_TUTOR_PROFILE,
} from '@tutorix/shared-graphql';
import {
  YearsOfExperienceEnum,
  YEARS_OF_EXPERIENCE_LIST,
  YEARS_OF_EXPERIENCE_LABELS,
  EmploymentType,
  EMPLOYMENT_TYPE_LIST,
  EMPLOYMENT_TYPE_LABELS,
  buildExperienceMutationInput,
  emptyExperienceRow,
  EXPERIENCE_CURRENT_DATE,
  mapExperienceToFormRow,
  normalizeYearsOfExperience,
  validateExperienceRow,
  type ExperienceFormRow,
  type ExperienceRowFieldErrors,
} from '@tutorix/shared-utils';
import type { StepComponentProps } from '../types';

type MyTutorProfileExperience = Parameters<typeof mapExperienceToFormRow>[0];

type MyTutorProfileData = {
  myTutorProfile?: {
    yearsOfExperience?: string | number | null;
    experiences?: MyTutorProfileExperience[];
  };
};

export const TutorExperience: React.FC<StepComponentProps> = () => {
  const [yearsOfExperience, setYearsOfExperience] = useState<YearsOfExperienceEnum>(
    YearsOfExperienceEnum.ZERO_TO_TWO
  );
  const [experiences, setExperiences] = useState<ExperienceFormRow[]>(() => [
    emptyExperienceRow(),
  ]);
  const [errors, setErrors] = useState<Record<number, ExperienceRowFieldErrors>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savingSectionIndex, setSavingSectionIndex] = useState<number | null>(null);
  const [hasSuccessfullySaved, setHasSuccessfullySaved] = useState(false);

  const { data: profileData } = useQuery<MyTutorProfileData>(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const profile = profileData?.myTutorProfile;
    if (profile?.yearsOfExperience != null) {
      setYearsOfExperience(normalizeYearsOfExperience(profile.yearsOfExperience));
    }
    const list = profile?.experiences;
    if (list?.length) {
      setHasSuccessfullySaved(true);
      setExperiences(list.map(mapExperienceToFormRow));
    } else if (list && list.length === 0 && profile?.yearsOfExperience) {
      setExperiences([emptyExperienceRow()]);
    }
  }, [profileData?.myTutorProfile]);

  const [saveExperiences, { loading: isSubmitting }] = useMutation(
    SAVE_TUTOR_EXPERIENCES,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
      update: (cache, { data }, { variables }) => {
        if (!data?.saveTutorExperiences) return;
        const advanceToNextStep = variables?.input?.advanceToNextStep !== false;
        if (!advanceToNextStep) return;
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
      onCompleted: (data) => {
        const saved = data?.saveTutorExperiences ?? [];
        if (saved.length > 0) {
          setExperiences((prev) =>
            prev.map((exp, i) => {
              const s = saved[i];
              if (s?.id != null) return { ...exp, id: s.id };
              return exp;
            })
          );
        }
      },
      onError: (error) => {
        setSubmitError(
          error.graphQLErrors?.[0]?.message ||
            error.message ||
            'Failed to save experiences. Please try again.'
        );
      },
    }
  );

  const updateRow = useCallback((index: number, updates: Partial<ExperienceFormRow>) => {
    setExperiences((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    );
    setErrors((prev) => {
      const next = { ...prev };
      const rowErrors = next[index];
      if (rowErrors) {
        const keys = Object.keys(updates) as (keyof ExperienceFormRow)[];
        keys.forEach((k) => delete rowErrors[k]);
        if (Object.keys(rowErrors).length === 0) delete next[index];
      }
      return next;
    });
  }, []);

  const addExperience = useCallback(() => {
    setExperiences((prev) => [...prev, emptyExperienceRow()]);
  }, []);

  const validateRow = useCallback(
    (index: number): boolean => {
      setFormError(null);
      const row = experiences[index];
      if (!row) return false;
      const result = validateExperienceRow(row);
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
    [experiences]
  );

  const validate = useCallback((): boolean => {
    setFormError(null);
    let valid = true;
    const next: Record<number, ExperienceRowFieldErrors> = {};
    experiences.forEach((row, index) => {
      const result = validateExperienceRow(row);
      if (result.ok === false) {
        next[index] = result.fieldErrors;
        valid = false;
      }
    });
    setErrors(next);
    return valid;
  }, [experiences]);

  const handleSaveSection = (index: number) => {
    setSubmitError(null);
    if (!validateRow(index)) return;
    setSavingSectionIndex(index);
    saveExperiences({
      variables: {
        input: {
          experiences: buildExperienceMutationInput(experiences),
          yearsOfExperience,
          advanceToNextStep: false,
        },
      },
    })
      .then(() => setHasSuccessfullySaved(true))
      .finally(() => setSavingSectionIndex(null));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    saveExperiences({
      variables: {
        input: {
          experiences: buildExperienceMutationInput(experiences),
          yearsOfExperience,
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
          Add your teaching and work experience. You can add multiple experiences.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-primary">
          Years of experience <span className="text-danger">*</span>
        </label>
        <select
          value={yearsOfExperience}
          onChange={(e) =>
            setYearsOfExperience(e.target.value as YearsOfExperienceEnum)
          }
          className={inputCls(false)}
        >
          {YEARS_OF_EXPERIENCE_LIST.map((v) => (
            <option key={v} value={v}>
              {YEARS_OF_EXPERIENCE_LABELS[v]}
            </option>
          ))}
        </select>
      </div>

      {experiences.map((row, index) => {
        const isSelfEmployed = row.employmentType === EmploymentType.SELF_EMPLOYED;
        return (
          <div
            key={row.id ?? `new-${index}`}
            className="rounded-xl border border-subtle bg-gray-50/50 p-5"
          >
            <div className="mb-4">
              <h3 className="text-base font-semibold text-primary">
                Experience {index + 1}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-primary">
                    Employment type <span className="text-danger">*</span>
                  </label>
                  <select
                    value={row.employmentType}
                    onChange={(e) =>
                      updateRow(index, {
                        employmentType: e.target.value as EmploymentType,
                      })
                    }
                    className={inputCls(false)}
                  >
                    {EMPLOYMENT_TYPE_LIST.map((t) => (
                      <option key={t} value={t}>
                        {EMPLOYMENT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-primary">
                    Job title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={row.jobTitle}
                    onChange={(e) => updateRow(index, { jobTitle: e.target.value })}
                    className={inputCls(!!errors[index]?.jobTitle)}
                    placeholder="e.g. Mathematics Teacher, Private Tutor"
                  />
                  {errors[index]?.jobTitle && (
                    <p className="text-xs text-danger">{errors[index].jobTitle}</p>
                  )}
                </div>
              </div>

              {!isSelfEmployed && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-primary">
                    Employer name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={row.employerName}
                    onChange={(e) =>
                      updateRow(index, { employerName: e.target.value })
                    }
                    className={inputCls(!!errors[index]?.employerName)}
                    placeholder="e.g. ABC School, XYZ Institute"
                  />
                  {errors[index]?.employerName && (
                    <p className="text-xs text-danger">
                      {errors[index].employerName}
                    </p>
                  )}
                </div>
              )}

              {!isSelfEmployed && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-primary">
                    Employer address <span className="text-danger">*</span>
                  </label>
                  <textarea
                    value={row.employerAddress}
                    onChange={(e) =>
                      updateRow(index, { employerAddress: e.target.value })
                    }
                    className={`min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-primary shadow-sm focus:outline-none focus:border-primary ${
                      errors[index]?.employerAddress ? 'border-danger' : 'border-subtle'
                    }`}
                    placeholder="Full address of the employer"
                    rows={3}
                  />
                  {errors[index]?.employerAddress && (
                    <p className="text-xs text-danger">
                      {errors[index].employerAddress}
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-primary">
                    Start date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    value={row.startDate}
                    onChange={(e) => updateRow(index, { startDate: e.target.value })}
                    className={inputCls(!!errors[index]?.startDate)}
                    max={EXPERIENCE_CURRENT_DATE}
                  />
                  {errors[index]?.startDate && (
                    <p className="text-xs text-danger">{errors[index].startDate}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-primary">
                    End date
                    {!row.isCurrent && <span className="text-danger"> *</span>}
                  </label>
                  <input
                    type="date"
                    value={row.endDate}
                    onChange={(e) => updateRow(index, { endDate: e.target.value })}
                    className={inputCls(!!errors[index]?.endDate)}
                    disabled={row.isCurrent}
                    min={row.startDate || undefined}
                    max={EXPERIENCE_CURRENT_DATE}
                    style={row.isCurrent ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                  />
                  {errors[index]?.endDate && (
                    <p className="text-xs text-danger">{errors[index].endDate}</p>
                  )}
                </div>
                <div className="space-y-1 flex items-end pb-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.isCurrent}
                      onChange={(e) =>
                        updateRow(index, { isCurrent: e.target.checked })
                      }
                    />
                    <span className="text-sm font-medium text-primary">
                      Currently working here
                    </span>
                  </label>
                </div>
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
            </div>
          </div>
        );
      })}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={addExperience}
          className="h-10 rounded-lg border border-subtle bg-white px-4 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-gray-50"
        >
          Add More
        </button>
      </div>

      {(formError || submitError) && (
        <div className="rounded-lg border border-danger bg-red-50 p-3 text-sm text-danger">
          {formError || submitError}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!hasSuccessfullySaved || isSubmitting}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </form>
  );
};
