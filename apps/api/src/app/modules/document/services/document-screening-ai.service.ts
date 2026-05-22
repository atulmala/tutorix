import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import { DocumentScreeningStatusEnum } from '../enums/document-screening-status.enum';
import {
  isOnboardingEducationDocument,
  isOnboardingIdDocument,
} from '../document-type-helpers';
import {
  buildDynamicScreeningUserText,
  DOCUMENT_SCREENING_STATIC_SYSTEM,
} from '../document-screening-prompts';

export interface AiScreeningRawResponse {
  accept: boolean;
  nameMatch: boolean;
  confidence: number;
  reason: string;
}

export interface AiScreeningTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

export interface AiScreeningResult {
  status: DocumentScreeningStatusEnum;
  confidence: number;
  summaryNotes: string;
  modelId: string;
  usage?: AiScreeningTokenUsage;
}

function documentTypeKey(documentType: DocumentTypeEnum): string {
  const key = DocumentTypeEnum[documentType];
  return typeof key === 'string' ? key : String(documentType);
}

export function extractAiScreeningTokenUsage(
  usage: Anthropic.Messages.Usage | undefined,
): AiScreeningTokenUsage {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    cacheCreationInputTokens: usage?.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage?.cache_read_input_tokens ?? 0,
  };
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
): Omit<AiScreeningResult, 'modelId' | 'usage'> {
  if (!parsed) {
    return {
      status: DocumentScreeningStatusEnum.PENDING_HUMAN,
      confidence: 0,
      summaryNotes: 'Could not verify document automatically — queued for human review.',
    };
  }

  const passed = parsed.accept && parsed.nameMatch;

  if (!passed) {
    return {
      status: DocumentScreeningStatusEnum.PENDING_HUMAN,
      confidence: parsed.confidence,
      summaryNotes: parsed.reason,
    };
  }

  if (isOnboardingIdDocument(documentType)) {
    return {
      status: DocumentScreeningStatusEnum.PASSED_AUTOMATED,
      confidence: parsed.confidence,
      summaryNotes: parsed.reason,
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
    };
  }

  return {
    status: DocumentScreeningStatusEnum.PENDING_HUMAN,
    confidence: parsed.confidence,
    summaryNotes: parsed.reason,
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

  private isPromptCachingEnabled(): boolean {
    const raw =
      this.configService.get<string>('DOCUMENT_SCREENING_PROMPT_CACHING_ENABLED') ??
      process.env.DOCUMENT_SCREENING_PROMPT_CACHING_ENABLED ??
      'true';
    return raw !== 'false' && raw !== '0';
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
    const promptCaching = this.isPromptCachingEnabled();

    const mediaBlock: Anthropic.Messages.ContentBlockParam =
      mimeType === 'application/pdf'
        ? {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          }
        : mimeType === 'image/jpeg' || mimeType === 'image/png'
          ? {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64,
              },
            }
          : (() => {
              throw new Error(`Unsupported MIME type for AI screening: ${mimeType}`);
            })();

    const systemBlocks: Anthropic.Messages.TextBlockParam[] = promptCaching
      ? [
          {
            type: 'text',
            text: DOCUMENT_SCREENING_STATIC_SYSTEM,
            cache_control: { type: 'ephemeral' },
          },
        ]
      : [{ type: 'text', text: DOCUMENT_SCREENING_STATIC_SYSTEM }];

    const response = await client.messages.create({
      model: modelId,
      max_tokens: 1024,
      system: systemBlocks,
      messages: [
        {
          role: 'user',
          content: [
            mediaBlock,
            {
              type: 'text',
              text: buildDynamicScreeningUserText(documentType, expectedOwnerName),
            },
          ],
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim();

    const usage = extractAiScreeningTokenUsage(response.usage);
    const parsed = parseAiResponseText(text);
    const result = mapAiResultToScreeningStatus(
      documentType,
      parsed,
      this.getConfidenceThreshold(),
    );

    this.logger.debug(
      `AI screening documentType=${documentTypeKey(documentType)} status=${result.status} confidence=${result.confidence} ` +
        `tokens in=${usage.inputTokens} out=${usage.outputTokens} ` +
        `cacheCreate=${usage.cacheCreationInputTokens} cacheRead=${usage.cacheReadInputTokens}`,
    );

    return { ...result, modelId, usage };
  }
}
