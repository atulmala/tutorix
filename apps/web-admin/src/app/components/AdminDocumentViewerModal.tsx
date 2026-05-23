import React, { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { ADMIN_REVIEW_DOCUMENT } from '@tutorix/shared-graphql';
import {
  documentStatusBadgeClass,
  documentStatusLabel,
  isDocumentPendingHuman,
} from '../utils/tutor-detail-formatters';

export type AdminDocumentDetail = {
  id: number;
  name?: string | null;
  documentType?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  previewUrl?: string | null;
  viewUrl?: string | null;
  screening?: {
    status?: string | null;
    summaryNotes?: string | null;
    confidence?: number | null;
    automatedAt?: string | null;
    reviewerNote?: string | null;
    reviewedAt?: string | null;
  } | null;
};

type AdminDocumentViewerModalProps = {
  document: AdminDocumentDetail;
  onClose: () => void;
  onReviewComplete: () => void;
};

export function AdminDocumentViewerModal({
  document,
  onClose,
  onReviewComplete,
}: AdminDocumentViewerModalProps) {
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [reviewDocument, { loading }] = useMutation(ADMIN_REVIEW_DOCUMENT);

  const status = document.screening?.status;
  const canReview = isDocumentPendingHuman(status);
  const isPdf = document.mimeType?.includes('pdf');
  const viewerUrl = isPdf ? document.viewUrl : document.previewUrl ?? document.viewUrl;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleReview = async (approve: boolean) => {
    await reviewDocument({
      variables: {
        input: {
          documentId: document.id,
          approve,
          note: approve ? undefined : rejectNote.trim() || undefined,
        },
      },
    });
    onReviewComplete();
    onClose();
  };

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

        {canReview && (
          <div className="border-t border-subtle bg-white px-5 py-4">
            {showRejectNote && (
              <label className="mb-3 block">
                <span className="text-xs font-medium text-muted">Rejection note (optional)</span>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-subtle px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  placeholder="Reason for rejection"
                />
              </label>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  if (!showRejectNote) {
                    setShowRejectNote(true);
                    return;
                  }
                  void handleReview(false);
                }}
                className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-50 disabled:opacity-50"
              >
                {showRejectNote ? 'Confirm reject' : 'Reject'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleReview(true)}
                className="rounded-lg border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Accept
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
