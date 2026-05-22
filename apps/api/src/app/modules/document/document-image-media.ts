import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { pdf } from 'pdf-to-img';
import sharp from 'sharp';

const THUMB_SIZES = [
  ['sm', 300],
  ['md', 600],
  ['lg', 1024],
] as const;

const RASTER_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
  'image/avif',
]);

function clampHex(hex: string): string {
  return hex.length === 1 ? `0${hex}` : hex;
}

async function averageColorHex(imageBuf: Buffer): Promise<string> {
  const { data, info } = await sharp(imageBuf)
    .resize(1, 1, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const r = data[0];
  const g = channels > 1 ? data[1] : r;
  const b = channels > 2 ? data[2] : r;
  return `#${clampHex(r.toString(16))}${clampHex(g.toString(16))}${clampHex(b.toString(16))}`;
}

export function keyToPublicPath(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export function buildOriginalDocumentUrl(
  bucket: string,
  key: string,
  publicBaseUrl?: string,
): string {
  const base = publicBaseUrl?.replace(/\/$/, '') ?? '';
  if (base) return `${base}/${keyToPublicPath(key)}`;
  return `s3://${bucket}/${key}`;
}

function sniffImageMime(buf: Buffer): string {
  if (buf.length < 12) return '';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'image/png';
  }
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    return 'image/webp';
  }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return 'image/gif';
  }
  return '';
}

export type TutorDocumentImageMediaPatch = {
  thumbnailSmall: string;
  thumbnailMedium: string;
  thumbnailLarge: string;
  originalUrl: string;
  averageColor: string;
  width: number;
  height: number;
};

export async function buildPdfFirstPageBuffer(pdfBytes: Buffer): Promise<Buffer | null> {
  try {
    const document = await pdf(pdfBytes, { scale: 2 });
    for await (const page of document) {
      return Buffer.from(page);
    }
    return null;
  } catch {
    return null;
  }
}

async function uploadThumbnailsFromRasterBuffer(params: {
  s3: S3Client;
  bucket: string;
  storageKey: string;
  body: Buffer;
  publicBaseUrl?: string;
}): Promise<TutorDocumentImageMediaPatch> {
  const { s3, bucket, storageKey, body, publicBaseUrl } = params;

  const meta = await sharp(body).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const avg = await averageColorHex(body);

  const dot = storageKey.lastIndexOf('.');
  const basePath = dot > 0 ? storageKey.slice(0, dot) : storageKey;

  const publicBase = publicBaseUrl?.replace(/\/$/, '') ?? '';
  const toRef = (thumbKey: string) =>
    publicBase ? `${publicBase}/${keyToPublicPath(thumbKey)}` : thumbKey;

  const thumbKeys: Record<string, string> = {};

  for (const [suffix, maxPx] of THUMB_SIZES) {
    const thumbBuf = await sharp(body)
      .rotate()
      .resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const thumbKey = `${basePath}_thumb_${suffix}.webp`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: thumbKey,
        Body: thumbBuf,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000',
      }),
    );
    thumbKeys[suffix] = thumbKey;
  }

  return {
    thumbnailSmall: toRef(thumbKeys.sm),
    thumbnailMedium: toRef(thumbKeys.md),
    thumbnailLarge: toRef(thumbKeys.lg),
    originalUrl: buildOriginalDocumentUrl(bucket, storageKey, publicBaseUrl),
    averageColor: avg,
    width,
    height,
  };
}

/**
 * Raster images and PDFs (first page). Uploads WebP thumbs beside original key.
 */
export async function buildTutorDocumentImageMediaPatch(params: {
  s3: S3Client;
  bucket: string;
  storageKey: string;
  mimeTypeHeader: string;
  body: Buffer;
  publicBaseUrl?: string;
}): Promise<TutorDocumentImageMediaPatch | null> {
  const { s3, bucket, storageKey, mimeTypeHeader, body, publicBaseUrl } = params;

  const headMime = mimeTypeHeader.split(';')[0].trim().toLowerCase();
  let mimeType =
    headMime && headMime !== 'application/octet-stream'
      ? headMime
      : sniffImageMime(body);

  let rasterBody = body;

  if (mimeType === 'application/pdf') {
    const firstPage = await buildPdfFirstPageBuffer(body);
    if (!firstPage) return null;
    rasterBody = firstPage;
    mimeType = sniffImageMime(firstPage) || 'image/png';
  }

  if (!mimeType || !RASTER_IMAGE_MIME.has(mimeType)) {
    return null;
  }

  return uploadThumbnailsFromRasterBuffer({
    s3,
    bucket,
    storageKey,
    body: rasterBody,
    publicBaseUrl,
  });
}
