/**
 * S3 ObjectCreated handler: read object + x-amz-meta (job-id, document-type),
 * run Anthropic screening, then POST /api/internal/document-verification/callback
 * with HMAC headers. The API does not run document AI; this Lambda is required
 * to move tutor upload jobs from PROCESSING to COMPLETE or FAILED.
 *
 * Env:
 *   API_BASE_URL — e.g. https://app.example.com/api (no trailing slash)
 *   DOCUMENT_VERIFICATION_WEBHOOK_SECRET — shared with Nest
 *   ANTHROPIC_API_KEY
 *   ANTHROPIC_DOCUMENT_SCREENING_MODEL — optional, default claude-sonnet-4-20250514
 */
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import Anthropic from '@anthropic-ai/sdk';
import { createHmac } from 'crypto';

const s3Region =
  process.env.AWS_REGION ||
  process.env.AWS_DEFAULT_REGION ||
  process.env.S3_DOCUMENTS_BUCKET_REGION ||
  undefined;
const s3 = new S3Client(s3Region ? { region: s3Region } : {});

const ID_TYPES = new Set(['AADHAAR_CARD', 'PAN_CARD']);
const EDU_TYPES = new Set(['CLASS_XII_MARKSHEET', 'HIGHEST_DEGREE_CERTIFICATE']);

const ID_EXPECTATION = {
  AADHAAR_CARD:
    'Indian Aadhaar card FRONT (photo side with UID/lion emblem typical of front).',
  PAN_CARD: 'Indian PAN card issued by Income Tax Department.',
};

function buildPrompt(documentTypeKey) {
  const expectation =
    ID_EXPECTATION[documentTypeKey] ||
    (EDU_TYPES.has(documentTypeKey)
      ? 'an official education document such as a class XII / higher-secondary marksheet or a university degree certificate or transcript.'
      : 'the expected document type.');

  const aadhaarFrontChecklist =
    documentTypeKey === 'AADHAAR_CARD'
      ? `

Indian Aadhaar FRONT — treat as valid only if the image clearly matches a real Aadhaar front. Look for: UIDAI / Aadhaar branding and typical front layout; a 12-digit Aadhaar number field as a visible pattern (never transcribe or quote digits in "reason"); wording such as "Government of India" or standard Aadhaar headings; a QR code; the holder photograph. Reject wrong ID type, unrelated images, or unclear screenshots.`
      : '';

  return `You verify tutor onboarding uploads for an Indian education platform.

Document slot expectation: ${expectation}${aadhaarFrontChecklist}

Reply ONLY with a compact JSON object (no markdown) using this shape:
{"accept":true|false,"confidence":0-1,"reason":"one short sentence for admins"}

Rules:
- For government ID slots (Aadhaar front, PAN): set "accept" to true only if the image clearly shows that expected ID type (layout, headings, typical fields). Reject screenshots, unrelated photos, blank pages, or wrong ID type. Do NOT transcribe full ID numbers or quote them.
- For education certificates: set "accept" to true if the document plausibly looks like an official marksheet, board certificate, degree, or transcript (headers, institution/board name, grades or marks, seals). If unsure, still use accept true — a human will review. Set "reason" briefly.
- Never include Aadhaar numbers, PAN strings, or other sensitive identifiers in "reason".`;
}

function parseAiResponse(documentTypeKey, raw, modelId) {
  let parsed;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    if (ID_TYPES.has(documentTypeKey)) {
      return {
        accepted: false,
        screeningStatus: 'REJECTED',
        confidence: 0,
        summaryNotes: 'Could not verify document automatically.',
        modelId,
      };
    }
    return {
      accepted: true,
      screeningStatus: 'PENDING_HUMAN',
      confidence: 0,
      summaryNotes: 'Automatic analysis inconclusive — queued for human review.',
      modelId,
    };
  }

  const accept = parsed.accept === true;
  const confidence =
    typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.7;
  const summaryNotes = (parsed.reason || 'No summary').slice(0, 500);

  if (EDU_TYPES.has(documentTypeKey)) {
    return {
      accepted: true,
      screeningStatus: 'PENDING_HUMAN',
      confidence,
      summaryNotes,
      modelId,
    };
  }

  if (ID_TYPES.has(documentTypeKey)) {
    return {
      accepted: accept,
      screeningStatus: accept ? 'PASSED_AUTOMATED' : 'REJECTED',
      confidence,
      summaryNotes,
      modelId,
    };
  }

  return {
    accepted: accept,
    screeningStatus: 'PENDING_HUMAN',
    confidence,
    summaryNotes,
    modelId,
  };
}

/** @param {{ accepted: boolean; screeningStatus: string; summaryNotes: string; confidence: number; modelId: string }} ai */
function callbackBodyForAi(jobId, documentTypeKey, ai) {
  if (ID_TYPES.has(documentTypeKey) && !ai.accepted) {
    return {
      jobId,
      outcome: 'FAILURE',
      failureReason:
        ai.summaryNotes ||
        'This does not look like the requested ID document. Please upload a clear photo or scan.',
    };
  }

  const screeningStatus =
    EDU_TYPES.has(documentTypeKey) || !ID_TYPES.has(documentTypeKey)
      ? 'PENDING_HUMAN'
      : 'PASSED_AUTOMATED';

  return {
    jobId,
    outcome: 'SUCCESS',
    screeningStatus,
    modelId: ai.modelId,
    confidence: ai.confidence,
    summaryNotes: ai.summaryNotes,
  };
}

async function screenWithAi(documentTypeKey, mimeType, bytes) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const model =
    process.env.ANTHROPIC_DOCUMENT_SCREENING_MODEL || 'claude-sonnet-4-20250514';

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const client = new Anthropic({ apiKey });
  const base64 = bytes.toString('base64');

  /** @type {import('@anthropic-ai/sdk').Anthropic.Messages.MessageCreateParams['messages'][0]['content']} */
  const visionParts = [];

  if (mimeType === 'application/pdf') {
    visionParts.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64,
      },
    });
  } else if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    visionParts.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mimeType,
        data: base64,
      },
    });
  } else {
    throw new Error(`Unsupported MIME type for AI screening: ${mimeType}`);
  }

  visionParts.push({
    type: 'text',
    text: buildPrompt(documentTypeKey),
  });

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: visionParts }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  return parseAiResponse(documentTypeKey, text, model);
}

async function postCallback(body) {
  const base =
    (process.env.API_BASE_URL || '').replace(/\/$/, '') ||
    (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
  const secret = process.env.DOCUMENT_VERIFICATION_WEBHOOK_SECRET || '';
  if (!base || !secret) {
    throw new Error('API_BASE_URL and DOCUMENT_VERIFICATION_WEBHOOK_SECRET are required');
  }

  const ts = String(Math.floor(Date.now() / 1000));
  const raw = JSON.stringify(body);
  const signature = createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');

  const res = await fetch(`${base}/internal/document-verification/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tutorix-timestamp': ts,
      'x-tutorix-signature': signature,
    },
    body: raw,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Callback HTTP ${res.status}: ${t}`);
  }
}

/**
 * @param {import('@aws-sdk/client-s3').HeadObjectCommandOutput} head
 */
function metaGet(head, key) {
  const m = head.Metadata || {};
  const lower = key.toLowerCase();
  for (const k of Object.keys(m)) {
    if (k.toLowerCase() === lower) return m[k];
  }
  return undefined;
}

export async function processRecord(record) {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

  let head;
  try {
    head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (e) {
    console.error('HeadObject failed', key, e);
    return;
  }

  const jobId = metaGet(head, 'job-id');
  const documentTypeKey = metaGet(head, 'document-type');
  if (!jobId || !documentTypeKey) {
    console.warn('Missing job-id or document-type metadata, skipping', key);
    return;
  }

  let bodyBytes;
  try {
    const get = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    bodyBytes = Buffer.from(await get.Body.transformToByteArray());
  } catch (e) {
    console.error('GetObject failed', key, e);
    await postCallback({
      jobId,
      outcome: 'FAILURE',
      failureReason: 'Could not read uploaded file from storage.',
    });
    return;
  }

  const mimeType = (head.ContentType || 'application/octet-stream').split(';')[0].trim();

  let ai;
  try {
    ai = await screenWithAi(documentTypeKey, mimeType, bodyBytes);
  } catch (e) {
    console.error('AI screening failed', jobId, e);
    await postCallback({
      jobId,
      outcome: 'FAILURE',
      failureReason:
        'Automatic verification is temporarily unavailable. Try again later.',
    });
    return;
  }

  const body = callbackBodyForAi(jobId, documentTypeKey, ai);
  await postCallback(body);
}

export async function handler(event) {
  const records = event.Records || [];
  for (const record of records) {
    if (record.eventName && !record.eventName.startsWith('ObjectCreated')) {
      continue;
    }
    await processRecord(record);
  }
  return { ok: true };
}
