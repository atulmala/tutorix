#!/usr/bin/env node
/**
 * Invoke metadata extraction against a real S3 object (needs AWS credentials + region).
 *
 *   cd lambdas/tutor-document-metadata && npm install
 *   export AWS_REGION=us-east-2
 *   node local-invoke.mjs --bucket my-bucket --key tutors/1/onboarding/aadhaar/uuid.jpg
 *
 * Optional: DOCUMENT_PUBLIC_BASE_URL=https://cdn.example.com/docs
 */
import { processRecord } from './handler.mjs';

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

const bucket = arg('--bucket') || process.env.S3_DOCUMENTS_BUCKET || '';
const key = arg('--key') || process.env.S3_OBJECT_KEY || '';

if (!bucket || !key) {
  console.error(
    'Usage: node local-invoke.mjs --bucket <bucket> --key <object-key>\n' +
      'Or set S3_DOCUMENTS_BUCKET and S3_OBJECT_KEY.',
  );
  process.exit(1);
}

const record = {
  eventName: 'ObjectCreated:Put',
  s3: {
    bucket: { name: bucket },
    object: { key },
  },
};

const result = await processRecord(record);
console.log(JSON.stringify(result, null, 2));
