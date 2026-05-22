import { DocumentTypeEnum } from './enums/document-type.enum';

export function resolveDocumentPreviewPublicUrl(doc: {
  thumbnailSmall?: string | null;
  originalUrl?: string | null;
}): string | null {
  const thumb = doc.thumbnailSmall?.trim();
  if (thumb?.startsWith('http://') || thumb?.startsWith('https://')) {
    return thumb;
  }
  const original = doc.originalUrl?.trim();
  if (original?.startsWith('http://') || original?.startsWith('https://')) {
    return original;
  }
  return null;
}

export function resolveDocumentPreviewS3Key(doc: {
  thumbnailSmall?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
}): string | null {
  if (resolveDocumentPreviewPublicUrl(doc)) return null;

  const thumb = doc.thumbnailSmall?.trim();
  if (thumb && !thumb.startsWith('s3://')) {
    return thumb;
  }

  const mime = doc.mimeType?.split(';')[0]?.trim().toLowerCase();
  if (
    doc.storageKey &&
    (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp')
  ) {
    return doc.storageKey;
  }

  return null;
}

export const PREVIEW_URL_EXPIRES_SEC = 900;

export function isOnboardingRasterMime(mimeType?: string | null): boolean {
  const mime = mimeType?.split(';')[0]?.trim().toLowerCase();
  return mime === 'image/jpeg' || mime === 'image/png';
}

export function isPreviewableDocumentType(documentType: DocumentTypeEnum): boolean {
  return [
    DocumentTypeEnum.AADHAAR_CARD,
    DocumentTypeEnum.PAN_CARD,
    DocumentTypeEnum.CLASS_XII_MARKSHEET,
    DocumentTypeEnum.HIGHEST_DEGREE_CERTIFICATE,
  ].includes(documentType);
}
