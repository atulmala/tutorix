import React, { useEffect } from 'react';
import {
  documentStatusBadgeClass,
  documentStatusLabel,
} from '@tutorix/shared-utils';
import type { TutorDocumentDetail } from './types';

type TutorDocumentViewerModalProps = {
  document: TutorDocumentDetail;
  onClose: () => void;
};

export function TutorDocumentViewerModal({
  document,
  onClose,
}: TutorDocumentViewerModalProps) {
  const status = document.screening?.status;
  const isPdf = document.mimeType?.includes('pdf');
  const viewerUrl = isPdf ? document.viewUrl : document.previewUrl ?? document.viewUrl;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-viewer-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-subtle px-5 py-4">
          <div>
            <h2 id="document-viewer-title" className="text-lg font-semibold text-primary">
              {document.name ?? 'Document'}
            </h2>
            {document.filename && (
              <p className="mt-0.5 text-sm text-muted">{document.filename}</p>
            )}
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${documentStatusBadgeClass(status)}`}
            >
              {documentStatusLabel(status)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-slate-100 hover:text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-4">
          {viewerUrl ? (
            isPdf ? (
              <iframe
                title={document.name ?? 'Document preview'}
                src={viewerUrl}
                className="h-[min(60vh,520px)] w-full rounded-lg border border-subtle bg-white"
              />
            ) : (
              <img
                src={viewerUrl}
                alt={document.name ?? 'Document preview'}
                className="mx-auto max-h-[min(60vh,520px)] max-w-full rounded-lg border border-subtle bg-white object-contain"
              />
            )
          ) : (
            <p className="py-12 text-center text-sm text-muted">Preview unavailable.</p>
          )}

          {document.screening?.summaryNotes && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                AI screening notes
              </p>
              <p className="mt-1 text-sm text-amber-950">{document.screening.summaryNotes}</p>
            </div>
          )}

          {document.screening?.reviewerNote && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Reviewer note
              </p>
              <p className="mt-1 text-sm text-primary">{document.screening.reviewerNote}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
