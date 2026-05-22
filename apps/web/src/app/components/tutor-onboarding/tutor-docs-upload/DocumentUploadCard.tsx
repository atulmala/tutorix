import React, { useEffect, useState } from 'react';

type OnboardingDocType =
  | 'AADHAAR_CARD'
  | 'PAN_CARD'
  | 'CLASS_XII_MARKSHEET'
  | 'HIGHEST_DEGREE_CERTIFICATE';

type DocumentUploadCardProps = {
  slot: {
    documentType: OnboardingDocType;
    title: string;
    description: string;
  };
  doc?: {
    filename?: string | null;
    storageKey?: string | null;
    mimeType?: string | null;
    previewUrl?: string | null;
    verificationWorkflowStatus?: string | null;
    screening?: { status?: string | null; summaryNotes?: string | null } | null;
  };
  optimisticPreviewUrl?: string;
  err?: string;
  busy: boolean;
  profileLoading: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onPickFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  passed: boolean;
  rejected: boolean;
  humanPending: boolean;
  awaitingBatch: boolean;
};

function DocumentThumbnail({
  previewUrl,
  title,
}: {
  previewUrl?: string;
  title: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [previewUrl]);

  if (!previewUrl || failed) {
    return (
      <div
        className="flex h-28 w-full flex-col items-center justify-center rounded-lg border border-dashed border-subtle bg-white text-center text-xs text-muted"
        aria-hidden
      >
        <svg
          className="mb-1 h-8 w-8 text-muted/70"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <span>No file uploaded</span>
      </div>
    );
  }

  return (
    <div className="h-28 w-full overflow-hidden rounded-lg border border-subtle bg-white">
      <img
        src={previewUrl}
        alt={`${title} preview`}
        className="h-full w-full object-contain object-center"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function DocumentUploadCard({
  slot,
  doc,
  optimisticPreviewUrl,
  err,
  busy,
  profileLoading,
  inputRef,
  onPickFile,
  passed,
  rejected,
  humanPending,
  awaitingBatch,
}: DocumentUploadCardProps) {
  const hasFile = Boolean(doc?.storageKey);
  const previewUrl = optimisticPreviewUrl ?? doc?.previewUrl ?? undefined;

  return (
    <li className="flex h-full flex-col rounded-xl border border-subtle bg-gray-50/60 p-4">
      <DocumentThumbnail previewUrl={hasFile ? previewUrl : undefined} title={slot.title} />

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="text-base font-semibold text-primary">{slot.title}</h3>
        <p className="mt-1 text-sm text-muted">{slot.description}</p>

        {hasFile && (
          <div className="mt-2 space-y-1 text-sm font-medium text-primary">
            <p>
              {passed ? (
                <span className="text-emerald-700">
                  Accepted — you can proceed once all documents pass.
                </span>
              ) : rejected ? (
                <span className="text-red-700">
                  Not accepted
                  {doc?.filename ? (
                    <span className="ml-2 font-normal text-muted">({doc.filename})</span>
                  ) : null}
                </span>
              ) : humanPending ? (
                <span className="text-amber-800">
                  Under admin review — you’ll be notified when there’s an outcome.
                </span>
              ) : awaitingBatch ? (
                <span className="text-amber-800">
                  Uploaded — verification is queued.
                  {doc?.filename ? (
                    <span className="ml-2 font-normal text-muted">({doc.filename})</span>
                  ) : null}
                </span>
              ) : (
                <span className="text-amber-800">
                  Uploaded — pending verification
                  {doc?.filename ? (
                    <span className="ml-2 font-normal text-muted">({doc.filename})</span>
                  ) : null}
                </span>
              )}
            </p>
            {rejected && doc?.screening?.summaryNotes?.trim() && (
              <p className="text-sm font-normal text-red-600" role="alert">
                {doc.screening.summaryNotes.trim()}
              </p>
            )}
          </div>
        )}

        {err && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {err}
          </p>
        )}
      </div>

      <div className="mt-4">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          id={`doc-upload-${slot.documentType}`}
          disabled={busy || profileLoading}
          onChange={onPickFile}
        />
        <label
          htmlFor={`doc-upload-${slot.documentType}`}
          className={`inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border px-4 text-sm font-semibold shadow-sm transition ${
            busy || profileLoading
              ? 'cursor-not-allowed border-subtle bg-gray-100 text-muted'
              : 'border-primary/40 bg-white text-primary hover:border-primary hover:bg-primary/5'
          }`}
        >
          {busy ? 'Uploading…' : hasFile ? 'Replace file' : 'Choose file'}
        </label>
      </div>
    </li>
  );
}
