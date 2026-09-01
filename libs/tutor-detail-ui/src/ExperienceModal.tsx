import React, { useEffect, useState } from 'react';
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPE_LIST,
  EmploymentType,
  emptyExperienceRow,
  pinExperienceRowToMonthDay,
  validateExperienceRow,
  type ExperienceFormRow,
  type ExperienceRowFieldErrors,
} from '@tutorix/shared-utils';
import { MonthYearPickerField } from './MonthYearPickerField';

export type { ExperienceFormRow };

type ExperienceModalProps = {
  open: boolean;
  mode: 'edit' | 'add';
  initialRow: ExperienceFormRow;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (row: ExperienceFormRow) => void;
};

export function ExperienceModal({
  open,
  mode,
  initialRow,
  saving = false,
  error,
  onClose,
  onSubmit,
}: ExperienceModalProps) {
  const [row, setRow] = useState<ExperienceFormRow>(emptyExperienceRow());
  const [fieldErrors, setFieldErrors] = useState<ExperienceRowFieldErrors>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRow({ ...initialRow });
    setFieldErrors({});
    setValidationError(null);
  }, [open, initialRow]);

  if (!open) {
    return null;
  }

  const isSelfEmployed = row.employmentType === EmploymentType.SELF_EMPLOYED;
  const displayError = validationError ?? error;

  const inputCls = (hasError: boolean) =>
    `h-11 w-full rounded-md border bg-white px-3 text-primary shadow-sm focus:outline-none focus:border-primary ${
      hasError ? 'border-danger' : 'border-subtle'
    }`;

  const updateRow = (updates: Partial<ExperienceFormRow>) => {
    setRow((prev) => ({ ...prev, ...updates }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      (Object.keys(updates) as (keyof ExperienceFormRow)[]).forEach((k) => delete next[k]);
      return next;
    });
  };

  const handleSubmit = () => {
    const result = validateExperienceRow(pinExperienceRowToMonthDay(row));
    if (result.ok === false) {
      setFieldErrors(result.fieldErrors);
      setValidationError(null);
      return;
    }
    setValidationError(null);
    onSubmit(result.normalized);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="experience-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 id="experience-modal-title" className="text-xl font-semibold text-primary">
            {mode === 'edit' ? 'Edit experience' : 'Add new experience'}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                Employment type <span className="text-danger">*</span>
              </label>
              <select
                value={row.employmentType}
                onChange={(e) =>
                  updateRow({ employmentType: e.target.value as EmploymentType })
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
                onChange={(e) => updateRow({ jobTitle: e.target.value })}
                className={inputCls(!!fieldErrors.jobTitle)}
                placeholder="e.g. Mathematics Teacher, Private Tutor"
              />
              {fieldErrors.jobTitle ? (
                <p className="text-xs text-danger">{fieldErrors.jobTitle}</p>
              ) : null}
            </div>
          </div>

          {!isSelfEmployed ? (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-primary">
                  Employer name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={row.employerName}
                  onChange={(e) => updateRow({ employerName: e.target.value })}
                  className={inputCls(!!fieldErrors.employerName)}
                  placeholder="e.g. ABC School, XYZ Institute"
                />
                {fieldErrors.employerName ? (
                  <p className="text-xs text-danger">{fieldErrors.employerName}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-primary">
                  Employer address <span className="text-danger">*</span>
                </label>
                <textarea
                  value={row.employerAddress}
                  onChange={(e) => updateRow({ employerAddress: e.target.value })}
                  className={`min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-primary shadow-sm focus:outline-none focus:border-primary ${
                    fieldErrors.employerAddress ? 'border-danger' : 'border-subtle'
                  }`}
                  placeholder="Full address of the employer"
                  rows={3}
                />
                {fieldErrors.employerAddress ? (
                  <p className="text-xs text-danger">{fieldErrors.employerAddress}</p>
                ) : null}
              </div>
            </>
          ) : null}

          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-16">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="block text-sm font-medium text-primary">
                Start month/year <span className="text-danger">*</span>
              </label>
              <MonthYearPickerField
                value={row.startDate}
                onChange={(startDate) => updateRow({ startDate })}
                hasError={!!fieldErrors.startDate}
                monthAriaLabel="Start month"
                yearAriaLabel="Start year"
              />
              {fieldErrors.startDate ? (
                <p className="text-xs text-danger">{fieldErrors.startDate}</p>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="block text-sm font-medium text-primary">
                End month/year
                {!row.isCurrent ? <span className="text-danger"> *</span> : null}
              </label>
              <MonthYearPickerField
                value={row.endDate}
                onChange={(endDate) => updateRow({ endDate })}
                hasError={!!fieldErrors.endDate}
                disabled={row.isCurrent}
                minValue={row.startDate || undefined}
                monthAriaLabel="End month"
                yearAriaLabel="End year"
              />
              {fieldErrors.endDate ? (
                <p className="text-xs text-danger">{fieldErrors.endDate}</p>
              ) : null}
              <label className="mt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.isCurrent}
                  onChange={(e) =>
                    updateRow({
                      isCurrent: e.target.checked,
                      ...(e.target.checked ? { endDate: '' } : {}),
                    })
                  }
                />
                <span className="text-sm font-medium text-primary">Currently working here</span>
              </label>
            </div>
          </div>

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
