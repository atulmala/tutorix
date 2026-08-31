import { escapeHtml } from '../communication/email/email.utils';

export type FailedDocumentCopyItem = {
  label: string;
  reason: string;
};

export function formatFailedDocuments(items: FailedDocumentCopyItem[]): {
  failedCount: string;
  failedDocumentsText: string;
  failedDocumentsHtml: string;
} {
  const normalized = items.map((item) => ({
    label: item.label.trim() || 'Document',
    reason: item.reason.trim() || 'Not accepted',
  }));
  const failedDocumentsText = normalized
    .map((item) => `${item.label}: ${item.reason}`)
    .join('\n');
  const failedDocumentsHtml = `<ul>${normalized
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.label)}</strong>: ${escapeHtml(item.reason)}</li>`,
    )
    .join('')}</ul>`;
  return {
    failedCount: String(normalized.length),
    failedDocumentsText,
    failedDocumentsHtml,
  };
}
