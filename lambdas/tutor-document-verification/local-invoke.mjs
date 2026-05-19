#!/usr/bin/env node
/**
 * Run the same S3 → Anthropic → HMAC callback path as handler.mjs without an AWS
 * Lambda trigger. Use when the API is local/staging and S3 notifications are not wired.
 *
 * Prerequisites: job row is PROCESSING/ AWAITING_UPLOAD (callback accepts both);
 * object exists in S3 with x-amz-meta-job-id and x-amz-meta-document-type.
 *
 * Usage:
 *   cd lambdas/tutor-document-verification && npm install
 *   export API_BASE_URL=http://localhost:3000/api
 *   export DOCUMENT_VERIFICATION_WEBHOOK_SECRET=...
 *   export ANTHROPIC_API_KEY=...
 *   export AWS_REGION=us-east-2   # bucket region
 *   node local-invoke.mjs --bucket tutorix-documents-dev --key tutors/<tutorId>/onboarding/...
 *
 * The storage key is returned by registerTutorDocumentUploadJob or shown in the API DB.
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

await processRecord(record);
console.log('Done. Check API job status and document rows.');
