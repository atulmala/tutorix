/**
 * S3 ObjectCreated: derive DocumentEntity media fields for raster images.
 *
 * Writes WebP thumbnails beside the original:
 *   <base>_thumb_sm.webp (max 300px), _thumb_md.webp (600), _thumb_lg.webp (1024)
 *
 * Env:
 *   DOCUMENT_PUBLIC_BASE_URL — optional HTTPS/CDN base (no trailing slash). If set,
 *     thumbnailSmall/Medium/Large and originalUrl use it + path-encoded key segments.
 *     If unset, thumbnails use raw S3 keys; originalUrl uses s3://bucket/key.
 *
 * Deploy: install Sharp for Lambda Linux x86_64 before zipping:
 *   npm run install:lambda-linux
 *
 * PDF / non-images: skipped with width/height 0 and no thumbnails (see logs).
 */
import { S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { extractAndUploadDocumentMedia, shouldSkipObjectKey } from './metadata.mjs';

const s3Region =
  process.env.AWS_REGION ||
  process.env.AWS_DEFAULT_REGION ||
  process.env.S3_DOCUMENTS_BUCKET_REGION ||
  undefined;
const s3 = new S3Client(s3Region ? { region: s3Region } : {});

export async function processRecord(record) {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

  if (shouldSkipObjectKey(key)) {
    return { skipped: true, key, reason: 'filtered_key' };
  }

  try {
    const result = await extractAndUploadDocumentMedia(s3, {
      bucket,
      key,
      sharp,
    });

    console.log(JSON.stringify({ bucket, key, ...result }));

    return { bucket, key, ...result };
  } catch (e) {
    console.error('extractAndUploadDocumentMedia failed', bucket, key, e);
    throw e;
  }
}

export async function handler(event) {
  const records = event.Records || [];
  const out = [];
  for (const record of records) {
    if (record.eventName && !record.eventName.startsWith('ObjectCreated')) {
      continue;
    }
    out.push(await processRecord(record));
  }
  return { ok: true, results: out };
}
