import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import { DocumentScreeningStatusEnum } from '../enums/document-screening-status.enum';
import {
  isOnboardingEducationDocument,
  isOnboardingIdDocument,
} from '../document-type-helpers';

export interface AiScreeningRawResponse {
  accept: boolean;
  nameMatch: boolean;
  confidence: number;
  reason: string;
}

export interface AiScreeningResult {
  status: DocumentScreeningStatusEnum;
  confidence: number;
  summaryNotes: string;
  modelId: string;
}

const ID_EXPECTATION: Partial<Record<DocumentTypeEnum, string>> = {
  [DocumentTypeEnum.AADHAAR_CARD]:
    'Indian Aadhaar card FRONT (photo side with UID/lion emblem typical of front).',
  [DocumentTypeEnum.PAN_CARD]:
    'Indian PAN card issued by Income Tax Department.',
};

function documentTypeKey(documentType: DocumentTypeEnum): string {
  const key = DocumentTypeEnum[documentType];
  return typeof key === 'string' ? key : String(documentType);
}

function buildPrompt(
  documentType: DocumentTypeEnum,
  expectedOwnerName: string,
): string {
  const typeKey = documentTypeKey(documentType);
  const expectation =
    ID_EXPECTATION[documentType] ??
    (isOnboardingEducationDocument(documentType)
      ? 'an official education document such as a class XII / higher-secondary marksheet or a university degree certificate or transcript.'
      : 'the expected document type.');

  const aadhaarFrontChecklist =
    documentType === DocumentTypeEnum.AADHAAR_CARD
      ? `

Indian Aadhaar FRONT — treat as valid only if the image clearly matches a real Aadhaar front. Look for: UIDAI / Aadhaar branding and typical front layout; a 12-digit Aadhaar number field as a visible pattern (never transcribe or quote digits in "reason"); wording such as "Government of India" or standard Aadhaar headings; a QR code; the holder photograph. Reject wrong ID type, unrelated images, or unclear screenshots.`
      : '';

  return `You verify tutor onboarding uploads for an Indian education platform.

Document slot expectation: ${expectation}${aadhaarFrontChecklist}

The tutor's registered name is: "${expectedOwnerName}".
Set "nameMatch" to true only if the document holder's name reasonably matches this name (allow reordering, initials, or omitted middle names). Set "nameMatch" to false if the name clearly belongs to someone else or is unreadable.

Reply ONLY with a compact JSON object (no markdown) using this shape:
{"accept":true|false,"nameMatch":true|false,"confidence":0-1,"reason":"one short sentence for admins"}

Rules:
- For government ID slots (Aadhaar front, PAN): set "accept" to true only if the image clearly shows that expected ID type (layout, headings, typical fields). Reject screenshots, unrelated photos, blank pages, or wrong ID type. Do NOT transcribe full ID numbers or quote them.
- For education certificates (${typeKey}): set "accept" to true if the document plausibly looks like an official marksheet, board certificate, degree, or transcript (headers, institution/board name, grades or marks, seals). Set "accept" to false if it looks fake, unrelated, or clearly not an education document.
- Final screening requires both "accept" and "nameMatch" to be true for a pass.
- Never include Aadhaar numbers, PAN strings, or other sensitive identifiers in "reason".`;
}

export function parseAiResponseText(
  raw: string,
): AiScreeningRawResponse | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const confidence =
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.7;
    return {
      accept: parsed.accept === true,
      nameMatch: parsed.nameMatch === true,
      confidence,
      reason: String(parsed.reason || 'No summary').slice(0, 500),
    };
  } catch {
    return null;
  }
}

export function mapAiResultToScreeningStatus(
  documentType: DocumentTypeEnum,
  parsed: AiScreeningRawResponse | null,
  confidenceThreshold: number,
): AiScreeningResult {
  const modelId = 'unknown';

  if (!parsed) {
    if (isOnboardingIdDocument(documentType)) {
      return {
        status: DocumentScreeningStatusEnum.REJECTED_HUMAN,
        confidence: 0,
        summaryNotes: 'Could not verify document automatically.',
        modelId,
      };
    }
    return {
      status: DocumentScreeningStatusEnum.PENDING_HUMAN,
      confidence: 0,
      summaryNotes: 'Automatic analysis inconclusive — queued for human review.',
      modelId,
    };
  }

  const passed = parsed.accept && parsed.nameMatch;

  if (!passed) {
    return {
      status: DocumentScreeningStatusEnum.REJECTED_HUMAN,
      confidence: parsed.confidence,
      summaryNotes: parsed.reason,
      modelId,
    };
  }

  if (isOnboardingIdDocument(documentType)) {
    return {
      status: DocumentScreeningStatusEnum.PASSED_AUTOMATED,
      confidence: parsed.confidence,
      summaryNotes: parsed.reason,
      modelId,
    };
  }

  if (isOnboardingEducationDocument(documentType)) {
    const status =
      parsed.confidence >= confidenceThreshold
        ? DocumentScreeningStatusEnum.PASSED_AUTOMATED
        : DocumentScreeningStatusEnum.PENDING_HUMAN;
    return {
      status,
      confidence: parsed.confidence,
      summaryNotes: parsed.reason,
      modelId,
    };
  }

  return {
    status: DocumentScreeningStatusEnum.PENDING_HUMAN,
    confidence: parsed.confidence,
    summaryNotes: parsed.reason,
    modelId,
  };
}

@Injectable()
export class DocumentScreeningAiService {
  private readonly logger = new Logger(DocumentScreeningAiService.name);

  constructor(private readonly configService: ConfigService) {}

  private getModelId(): string {
    return (
      this.configService.get<string>('ANTHROPIC_DOCUMENT_SCREENING_MODEL') ||
      process.env.ANTHROPIC_DOCUMENT_SCREENING_MODEL ||
      'claude-sonnet-4-6'
    );
  }

  private getConfidenceThreshold(): number {
    const raw =
      this.configService.get<string>('DOCUMENT_SCREENING_CONFIDENCE_THRESHOLD') ||
      process.env.DOCUMENT_SCREENING_CONFIDENCE_THRESHOLD ||
      '0.85';
    const n = parseFloat(raw);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.85;
  }

  private getApiKey(): string {
    return (
      this.configService.get<string>('ANTHROPIC_API_KEY') ||
      process.env.ANTHROPIC_API_KEY ||
      ''
    );
  }

  async screenDocument(
    documentType: DocumentTypeEnum,
    mimeType: string,
    bytes: Buffer,
    expectedOwnerName: string,
  ): Promise<AiScreeningResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const modelId = this.getModelId();
    const client = new Anthropic({ apiKey });
    const base64 = bytes.toString('base64');

    const visionParts: Anthropic.Messages.ContentBlockParam[] = [];

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
      text: buildPrompt(documentType, expectedOwnerName),
    });

    const response = await client.messages.create({
      model: modelId,
      max_tokens: 1024,
      messages: [{ role: 'user', content: visionParts }],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim();

    const parsed = parseAiResponseText(text);
    const result = mapAiResultToScreeningStatus(
      documentType,
      parsed,
      this.getConfidenceThreshold(),
    );

    this.logger.debug(
      `AI screening documentType=${documentTypeKey(documentType)} status=${result.status} confidence=${result.confidence}`,
    );

    return { ...result, modelId };
  }
}
