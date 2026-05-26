import type { OnboardingDocType, SlotDoc } from './document-upload.types';

export const MAX_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

export function resolveMimeType(name: string, type?: string | null): string {
  if (type && ALLOWED_MIME.has(type)) {
    return type;
  }
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return type || '';
}

export function normalizeDocumentType(raw: unknown): string | undefined {
  if (typeof raw === 'string') return raw;
  return undefined;
}

export function findSlotDoc(
  documents: Array<{ documentType?: unknown }> | undefined,
  slot: OnboardingDocType,
): SlotDoc | undefined {
  const raw = documents?.find((d) => normalizeDocumentType(d.documentType) === slot);
  return raw as SlotDoc | undefined;
}

export function screeningPassed(screening: SlotDoc['screening']): boolean {
  const s = screening?.status;
  return s === 'PASSED_AUTOMATED' || s === 'APPROVED_HUMAN';
}

export function screeningRejected(screening: SlotDoc['screening']): boolean {
  return screening?.status === 'REJECTED_HUMAN';
}

export function screeningHumanPending(screening: SlotDoc['screening']): boolean {
  return screening?.status === 'PENDING_HUMAN';
}

export function isImageMime(mime: string): boolean {
  return mime === 'image/jpeg' || mime === 'image/png';
}

export function validatePickedFile(
  name: string,
  size: number,
  type?: string | null,
): { ok: true; mimeType: string } | { ok: false; error: string } {
  const mimeType = resolveMimeType(name, type);
  if (!ALLOWED_MIME.has(mimeType)) {
    return { ok: false, error: 'Please upload a PDF, JPG, or PNG file.' };
  }
  if (size < 1 || size > MAX_BYTES) {
    return {
      ok: false,
      error: `File must be between 1 byte and ${MAX_BYTES / (1024 * 1024)} MB.`,
    };
  }
  return { ok: true, mimeType };
}
