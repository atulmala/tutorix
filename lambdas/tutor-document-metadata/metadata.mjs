import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

function clampHex(hex) {
  return hex.length === 1 ? `0${hex}` : hex;
}

/**
 * @param {import('sharp')} sharp
 * @param {Buffer} imageBuf
 * @returns {Promise<string>} e.g. #a1b2c3
 */
export async function averageColorHex(sharp, imageBuf) {
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

const THUMB_SIZES = [
  ['sm', 300],
  ['md', 600],
  ['lg', 1024],
];

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
  'image/avif',
]);

export function shouldSkipObjectKey(key) {
  if (!key || key.includes('/../')) return true;
  if (/_thumb_(sm|md|lg)\.webp$/i.test(key)) return true;
  return false;
}

export function keyToPublicPath(key) {
  return key.split('/').map(encodeURIComponent).join('/');
}

export function buildOriginalUrl(bucket, key) {
  const base = (process.env.DOCUMENT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}/${keyToPublicPath(key)}`;
  return `s3://${bucket}/${key}`;
}

function sniffImageMime(buf) {
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

/**
 * @param {import('@aws-sdk/client-s3').S3Client} s3
 * @param {{ bucket: string; key: string; sharp: typeof import('sharp') }} opts
 */
export async function extractAndUploadDocumentMedia(s3, { bucket, key, sharp }) {
  const get = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bodyBytes = Buffer.from(await get.Body.transformToByteArray());

  const headMime = (get.ContentType || '').split(';')[0].trim().toLowerCase();
  const mimeType =
    headMime && headMime !== 'application/octet-stream'
      ? headMime
      : sniffImageMime(bodyBytes);

  const publicBase = (process.env.DOCUMENT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const toRef = (k) => (publicBase ? `${publicBase}/${keyToPublicPath(k)}` : k);

  if (!mimeType || !IMAGE_MIME.has(mimeType)) {
    return {
      skipped: true,
      reason: `unsupported_or_non_image:${mimeType || 'unknown'}`,
      thumbnailSmall: null,
      thumbnailMedium: null,
      thumbnailLarge: null,
      originalUrl: buildOriginalUrl(bucket, key),
      averageColor: null,
      width: 0,
      height: 0,
    };
  }

  const meta = await sharp(bodyBytes).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const avg = await averageColorHex(sharp, bodyBytes);

  const dot = key.lastIndexOf('.');
  const basePath = dot > 0 ? key.slice(0, dot) : key;
  /** @type {Record<string, string>} */
  const thumbKeys = {};

  for (const [suffix, maxPx] of THUMB_SIZES) {
    const thumbBuf = await sharp(bodyBytes)
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
    skipped: false,
    reason: null,
    thumbnailSmall: toRef(thumbKeys.sm),
    thumbnailMedium: toRef(thumbKeys.md),
    thumbnailLarge: toRef(thumbKeys.lg),
    originalUrl: buildOriginalUrl(bucket, key),
    averageColor: avg,
    width,
    height,
  };
}
