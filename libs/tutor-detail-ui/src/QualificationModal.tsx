import React, { useEffect, useState } from 'react';
import {
  EDUCATIONAL_QUALIFICATION_LABELS,
  EducationalQualification,
  GRADE_TYPE_LABELS,
  GRADE_TYPE_LIST,
  GradeType,
  getQualificationDegreeLabel,
  getQualificationDegreePlaceholder,
  getQualificationFieldOfStudyPlaceholder,
  getQualificationGradeValuePlaceholder,
  validateQualificationRow,
  type QualificationFormRow,
  type QualificationRowFieldErrors,
} from '@tutorix/shared-utils';

export type { QualificationFormRow };

type QualificationModalProps = {
  open: boolean;
  mode: 'edit' | 'add';
  initialRow: QualificationFormRow;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (row: QualificationFormRow) => void;
};

export function QualificationModal({
  open,
  mode,
  initialRow,
  saving = false,
  error,
  onClose,
  onSubmit,
}: QualificationModalProps) {
  const [row, setRow] = useState<QualificationFormRow>(initialRow);
  const [fieldErrors, setFieldErrors] = useState<QualificationRowFieldErrors>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!open) return;
    setRow({ ...initialRow });
    setFieldErrors({});
    setValidationError(null);
  }, [open, initialRow]);

  if (!open) {
    return null;
  }

  const isHigherSecondary =
    row.qualificationType === EducationalQualification.HIGHER_SECONDARY;
  const displayError = validationError ?? error;

  const inputCls = (hasError: boolean) =>
    `h-11 w-full rounded-md border bg-white px-3 text-primary shadow-sm focus:outline-none focus:border-primary ${
      hasError ? 'border-danger' : 'border-subtle'
    }`;

  const updateRow = (updates: Partial<QualificationFormRow>) => {
    setRow((prev) => ({ ...prev, ...updates }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      (Object.keys(updates) as (keyof QualificationFormRow)[]).forEach((k) => delete next[k]);
      return next;
    });
  };

  const handleSubmit = () => {
    const result = validateQualificationRow(row);
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
        aria-labelledby="qualification-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 id="qualification-modal-title" className="text-xl font-semibold text-primary">
            {mode === 'edit' ? 'Edit qualification' : 'Add qualification'}
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
          <div className="space-y-1">
            <label className="text-sm font-medium text-primary">Qualification type</label>
            <p className="rounded-md border border-subtle bg-gray-50 px-3 py-2.5 text-sm font-medium text-primary">
              {EDUCATIONAL_QUALIFICATION_LABELS[row.qualificationType]}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                {getQualificationDegreeLabel(row.qualificationType)}
                {!isHigherSecondary ? <span className="text-danger"> *</span> : null}
              </label>
              <input
                type="text"
                value={row.degreeName}
                onChange={(e) => updateRow({ degreeName: e.target.value })}
                className={inputCls(!isHigherSecondary && !!fieldErrors.degreeName)}
                placeholder={getQualificationDegreePlaceholder(row.qualificationType)}
                disabled={isHigherSecondary}
              />
              {!isHigherSecondary && fieldErrors.degreeName ? (
                <p className="text-xs text-danger">{fieldErrors.degreeName}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                Specialization <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={row.fieldOfStudy}
                onChange={(e) => updateRow({ fieldOfStudy: e.target.value })}
                className={inputCls(!!fieldErrors.fieldOfStudy)}
                placeholder={getQualificationFieldOfStudyPlaceholder(row.qualificationType)}
              />
              {fieldErrors.fieldOfStudy ? (
                <p className="text-xs text-danger">{fieldErrors.fieldOfStudy}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-primary">
              Board / University <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={row.boardOrUniversity}
              onChange={(e) => updateRow({ boardOrUniversity: e.target.value })}
              className={inputCls(!!fieldErrors.boardOrUniversity)}
              placeholder="e.g. CBSE, University of Delhi"
            />
            {fieldErrors.boardOrUniversity ? (
              <p className="text-xs text-danger">{fieldErrors.boardOrUniversity}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                Year obtained <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min={1950}
                max={currentYear}
                value={row.yearObtained}
                onChange={(e) => updateRow({ yearObtained: e.target.value })}
                className={inputCls(!!fieldErrors.yearObtained)}
                placeholder={String(currentYear)}
              />
              {fieldErrors.yearObtained ? (
                <p className="text-xs text-danger">{fieldErrors.yearObtained}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">
                Grade type <span className="text-danger">*</span>
              </label>
              <select
                value={row.gradeType}
                onChange={(e) => updateRow({ gradeType: e.target.value as GradeType })}
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
                onChange={(e) => updateRow({ gradeValue: e.target.value })}
                className={inputCls(!!fieldErrors.gradeValue)}
                placeholder={getQualificationGradeValuePlaceholder(row.gradeType)}
              />
              {fieldErrors.gradeValue ? (
                <p className="text-xs text-danger">{fieldErrors.gradeValue}</p>
              ) : null}
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
