import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  CLASS_CANCELLATION_REFUND_AI_SYSTEM,
  buildClassCancellationRefundUserPrompt,
} from '../class-cancellation-refund-ai-prompts';
import { ClassCancellationRefundAiStatusEnum } from '../enums/class-cancellation-refund-ai-status.enum';

export type RefundAiRecommendation = {
  aiStatus: ClassCancellationRefundAiStatusEnum;
  aiSummary: string;
  aiRejectionReason: string | null;
  aiConfidence: number;
  modelId: string;
};

type RefundAiRaw = {
  recommendation?: string;
  confidence?: number;
  reason?: string;
};

function parseRefundAiResponse(raw: string): RefundAiRaw | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as RefundAiRaw;
    return parsed;
  } catch {
    return null;
  }
}

@Injectable()
export class ClassCancellationRefundAiService {
  private readonly logger = new Logger(ClassCancellationRefundAiService.name);
  private client: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getModelId(): string {
    return (
      this.configService.get<string>('CLASS_CANCELLATION_REFUND_AI_MODEL') ||
      process.env.CLASS_CANCELLATION_REFUND_AI_MODEL ||
      this.configService.get<string>('DOCUMENT_SCREENING_AI_MODEL') ||
      process.env.DOCUMENT_SCREENING_AI_MODEL ||
      'claude-sonnet-4-20250514'
    );
  }

  private getClient(): Anthropic | null {
    const apiKey =
      this.configService.get<string>('ANTHROPIC_API_KEY') ||
      process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return null;
    }
    if (!this.client) {
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  async analyze(context: Record<string, unknown>): Promise<RefundAiRecommendation> {
    const modelId = this.getModelId();
    const client = this.getClient();
    const checks = context.checks as { issues?: string[] } | undefined;
    const deterministicIssues = checks?.issues ?? [];

    if (deterministicIssues.length > 0) {
      return {
        aiStatus: ClassCancellationRefundAiStatusEnum.rejected,
        aiSummary: 'Deterministic refund checks failed',
        aiRejectionReason: deterministicIssues.join('; '),
        aiConfidence: 1,
        modelId: 'deterministic',
      };
    }

    if (!client) {
      return {
        aiStatus: ClassCancellationRefundAiStatusEnum.approved,
        aiSummary: 'AI unavailable; deterministic checks passed',
        aiRejectionReason: null,
        aiConfidence: 0.5,
        modelId: 'none',
      };
    }

    try {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: 512,
        system: CLASS_CANCELLATION_REFUND_AI_SYSTEM,
        messages: [
          {
            role: 'user',
            content: buildClassCancellationRefundUserPrompt(context),
          },
        ],
      });
      const textBlock = response.content.find((block) => block.type === 'text');
      const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
      const parsed = parseRefundAiResponse(raw);
      const recommendation = parsed?.recommendation === 'approve' ? 'approve' : 'reject';
      const confidence =
        typeof parsed?.confidence === 'number'
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.7;
      const reason = String(parsed?.reason || 'No summary').slice(0, 500);

      return {
        aiStatus:
          recommendation === 'approve'
            ? ClassCancellationRefundAiStatusEnum.approved
            : ClassCancellationRefundAiStatusEnum.rejected,
        aiSummary: reason,
        aiRejectionReason:
          recommendation === 'reject' ? reason : null,
        aiConfidence: confidence,
        modelId,
      };
    } catch (error) {
      this.logger.warn(
        `Refund AI analysis failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      const fallbackApprove =
        deterministicIssues.length === 0
          ? ClassCancellationRefundAiStatusEnum.approved
          : ClassCancellationRefundAiStatusEnum.rejected;
      return {
        aiStatus: fallbackApprove,
        aiSummary: 'AI call failed; used deterministic checks',
        aiRejectionReason:
          fallbackApprove === ClassCancellationRefundAiStatusEnum.rejected
            ? deterministicIssues.join('; ')
            : null,
        aiConfidence: 0.5,
        modelId,
      };
    }
  }
}
