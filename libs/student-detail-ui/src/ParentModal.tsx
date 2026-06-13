import React, { useEffect, useState } from 'react';
import type { ParentFormValues } from './types';

type ParentModalProps = {
  open: boolean;
  initialValues?: {
    parentRelation?: string | null;
    parentName?: string | null;
  } | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ParentFormValues) => void;
};

const EMPTY_FORM: ParentFormValues = {
  parentRelation: 'FATHER',
  parentName: '',
};

function toForm(initial?: ParentModalProps['initialValues']): ParentFormValues {
  if (!initial) return EMPTY_FORM;
  const relation =
    initial.parentRelation === 'MOTHER' ? 'MOTHER' : 'FATHER';
  return {
    parentRelation: relation,
    parentName: initial.parentName?.trim() ?? '',
  };
}

export function ParentModal({
  open,
  initialValues,
  saving = false,
  error,
  onClose,
  onSubmit,
}: ParentModalProps) {
  const [parentRelation, setParentRelation] = useState<ParentFormValues['parentRelation']>(
    'FATHER',
  );
  const [parentName, setParentName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const form = toForm(initialValues);
    setParentRelation(form.parentRelation);
    setParentName(form.parentName);
    setValidationError(null);
  }, [open, initialValues]);

  const handleSubmit = () => {
    const name = parentName.trim();
    if (!name) {
      setValidationError('Parent name is required');
      return;
    }
    setValidationError(null);
    onSubmit({ parentRelation, parentName: name });
  };

  const displayError = validationError ?? error;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="parent-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 id="parent-modal-title" className="text-xl font-semibold text-primary">
            Parent / guardian
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
          <p className="text-sm text-muted">
            Please provide details for one parent or guardian.
          </p>

          <div className="space-y-2">
            <span className="text-sm font-medium text-primary">
              Relationship <span className="text-danger">*</span>
            </span>
            <div className="flex gap-4">
              {(['FATHER', 'MOTHER'] as const).map((value) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="parentRelation"
                    value={value}
                    checked={parentRelation === value}
                    onChange={() => setParentRelation(value)}
                    className="h-4 w-4 accent-[#5fa8ff]"
                  />
                  {value === 'FATHER' ? 'Father' : 'Mother'}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="parent-name" className="text-sm font-medium text-primary">
              Name <span className="text-danger">*</span>
            </label>
            <input
              id="parent-name"
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full rounded-md border border-subtle bg-white px-md py-sm text-primary shadow-sm focus:border-primary focus:outline-none"
              placeholder="Enter parent or guardian name"
            />
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
