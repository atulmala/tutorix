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
} from '@tutorix/shared-utils';
import type { StepComponentProps } from '../types';

interface ExperienceRow {
  id?: number;
  jobTitle: string;
  employerName: string;
  employerAddress: string;
  employmentType: EmploymentType;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

const currentYear = new Date().getFullYear();
const currentDate = new Date().toISOString().slice(0, 10);

const EMPLOYMENT_TYPE_BY_NUM: Record<number, EmploymentType> = {
  1: EmploymentType.FULL_TIME,
  2: EmploymentType.PART_TIME,
  3: EmploymentType.SELF_EMPLOYED,
  4: EmploymentType.FREELANCE,
  5: EmploymentType.INTERNSHIP,
  6: EmploymentType.TRAINEE,
};

function mapEmploymentType(v: string | number | null | undefined): EmploymentType {
  if (v == null) return EmploymentType.FULL_TIME;
  if (typeof v === 'number') return EMPLOYMENT_TYPE_BY_NUM[v] ?? EmploymentType.FULL_TIME;
  const found = Object.values(EmploymentType).find((x) => x === v);
  return found ?? EmploymentType.FULL_TIME;
}

const emptyExperience = (): ExperienceRow => ({
  jobTitle: '',
  employerName: '',
  employerAddress: '',
  employmentType: EmploymentType.FULL_TIME,
  startDate: '',
  endDate: '',
  isCurrent: false,
});

export const TutorExperience: React.FC<StepComponentProps> = () => {
  const [yearsOfExperience, setYearsOfExperience] = useState<YearsOfExperienceEnum>(
    YearsOfExperienceEnum.ZERO_TO_TWO
  );
  const [experiences, setExperiences] = useState<ExperienceRow[]>(() => [
    emptyExperience(),
  ]);
  const [errors, setErrors] = useState<
    Record<number, Partial<Record<keyof ExperienceRow, string>>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savingSectionIndex, setSavingSectionIndex] = useState<number | null>(null);
  const [hasSuccessfullySaved, setHasSuccessfullySaved] = useState(false);

  const { data: profileData } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const profile = profileData?.myTutorProfile;
    if (profile?.yearsOfExperience != null) {
      const v = profile.yearsOfExperience;
      if (typeof v === 'number') {
        setYearsOfExperience(
          ([
            YearsOfExperienceEnum.ZERO_TO_TWO,
            YearsOfExperienceEnum.TWO_TO_FIVE,
            YearsOfExperienceEnum.FIVE_TO_TEN,
            YearsOfExperienceEnum.MORE_THAN_TEN,
          ] as const)[(v as number) - 1] ?? YearsOfExperienceEnum.ZERO_TO_TWO
        );
      } else {
        setYearsOfExperience(v as YearsOfExperienceEnum);
      }
    }
    const list = profile?.experiences;
    if (list?.length) {
      setHasSuccessfullySaved(true);
      setExperiences(
        list.map(
          (e: {
            id?: number;
            jobTitle: string;
            employerName?: string | null;
            employerAddress?: string | null;
            employmentType: string;
            startDate: string;
            endDate?: string | null;
            isCurrent?: boolean;
          }) => ({
            id: e.id,
            jobTitle: e.jobTitle ?? '',
            employerName: e.employerName ?? '',
            employerAddress: e.employerAddress ?? '',
            employmentType: mapEmploymentType(e.employmentType),
            startDate: e.startDate ? e.startDate.slice(0, 10) : '',
            endDate: e.endDate ? e.endDate.slice(0, 10) : '',
            isCurrent: e.isCurrent ?? false,
          })
        )
      );
    } else if (list && list.length === 0 && profile?.yearsOfExperience) {
      setExperiences([emptyExperience()]);
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
        // Immediately merge returned ids into local state so subsequent saves
        // send correct ids and avoid creating duplicate rows
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

  const updateRow = useCallback((index: number, updates: Partial<ExperienceRow>) => {
    setExperiences((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    );
    setErrors((prev) => {
      const next = { ...prev };
      const rowErrors = next[index];
      if (rowErrors) {
        const keys = Object.keys(updates) as (keyof ExperienceRow)[];
        keys.forEach((k) => delete rowErrors[k]);
        if (Object.keys(rowErrors).length === 0) delete next[index];
      }
      return next;
    });
  }, []);

  const addExperience = useCallback(() => {
    setExperiences((prev) => [...prev, emptyExperience()]);
  }, []);

  const validateRow = useCallback(
    (index: number): boolean => {
      setFormError(null);
      const row = experiences[index];
      if (!row) return false;
      const e: Partial<Record<keyof ExperienceRow, string>> = {};
      if (!row.jobTitle.trim()) e.jobTitle = 'Required';
      if (row.employmentType !== EmploymentType.SELF_EMPLOYED) {
        if (!row.employerName.trim()) e.employerName = 'Required';
        if (!row.employerAddress.trim()) e.employerAddress = 'Required';
      }
      if (!row.startDate.trim()) e.startDate = 'Required';
      else {
        const start = new Date(row.startDate);
        if (Number.isNaN(start.getTime()))
          e.startDate = 'Invalid date';
        else if (start.getFullYear() < 1950 || start.getFullYear() > currentYear)
          e.startDate = `Year must be between 1950 and ${currentYear}`;
      }
      if (!row.isCurrent && !row.endDate.trim()) {
        e.endDate = 'Required when not currently working';
      } else if (!row.isCurrent && row.endDate.trim()) {
        const end = new Date(row.endDate);
        if (Number.isNaN(end.getTime())) e.endDate = 'Invalid date';
        else if (row.startDate && new Date(row.startDate) > end)
          e.endDate = 'End date must be after start date';
      }
      if (Object.keys(e).length) {
        setErrors((prev) => ({ ...prev, [index]: e }));
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
    const next: Record<number, Partial<Record<keyof ExperienceRow, string>>> = {};
    experiences.forEach((row, index) => {
      const e: Partial<Record<keyof ExperienceRow, string>> = {};
      if (!row.jobTitle.trim()) e.jobTitle = 'Required';
      if (row.employmentType !== EmploymentType.SELF_EMPLOYED) {
        if (!row.employerName.trim()) e.employerName = 'Required';
        if (!row.employerAddress.trim()) e.employerAddress = 'Required';
      }
      if (!row.startDate.trim()) e.startDate = 'Required';
      else {
        const start = new Date(row.startDate);
        if (Number.isNaN(start.getTime())) e.startDate = 'Invalid date';
        else if (start.getFullYear() < 1950 || start.getFullYear() > currentYear)
          e.startDate = `Year must be between 1950 and ${currentYear}`;
      }
      if (!row.isCurrent && !row.endDate.trim()) {
        e.endDate = 'Required when not currently working';
      } else if (!row.isCurrent && row.endDate.trim()) {
        const end = new Date(row.endDate);
        if (Number.isNaN(end.getTime())) e.endDate = 'Invalid date';
        else if (row.startDate && new Date(row.startDate) > end)
          e.endDate = 'End date must be after start date';
      }
      if (Object.keys(e).length) {
        next[index] = e;
        valid = false;
      }
    });
    setErrors(next);
    return valid;
  }, [experiences]);

  const buildExperiencesInput = () =>
    experiences.map((row) => ({
      id: row.id,
      jobTitle: row.jobTitle.trim(),
      employerName:
        row.employmentType === EmploymentType.SELF_EMPLOYED
          ? undefined
          : row.employerName.trim() || undefined,
      employerAddress:
        row.employmentType === EmploymentType.SELF_EMPLOYED
          ? undefined
          : row.employerAddress.trim() || undefined,
      employmentType: row.employmentType,
      startDate: row.startDate,
      endDate: row.isCurrent ? undefined : (row.endDate || undefined),
      isCurrent: row.isCurrent,
    }));

  const handleSaveSection = (index: number) => {
    setSubmitError(null);
    if (!validateRow(index)) return;
    setSavingSectionIndex(index);
    saveExperiences({
      variables: {
        input: {
          experiences: buildExperiencesInput(),
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
          experiences: buildExperiencesInput(),
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
              {/* Row 1: Employment type and job title */}
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

              {/* Row 2: Employer name (when not self-employed) */}
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

              {/* Row 3: Employer address (when not self-employed) */}
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

              {/* Row 4: Start date, End date, Currently working here */}
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
                    max={currentDate}
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
                    max={currentDate}
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
