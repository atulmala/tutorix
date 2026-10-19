import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJobNameEnum } from '../../../batch-jobs/enums/batch-job-name.enum';
import { BatchJobTriggerEnum } from '../../../batch-jobs/enums/batch-job-trigger.enum';
import { BatchJobRunService } from '../../../batch-jobs/services/batch-job-run.service';
import { ClassCancellationRefundRequestEntity } from '../entities/class-cancellation-refund-request.entity';
import { ClassCancellationRefundAiStatusEnum } from '../enums/class-cancellation-refund-ai-status.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../enums/class-cancellation-refund-payout-status.enum';
import { ClassCancellationRefundAiService } from './class-cancellation-refund-ai.service';
import { ClassCancellationRefundChecksService } from './class-cancellation-refund-checks.service';
import { ClassCancellationRefundPayoutService } from './class-cancellation-refund-payout.service';

@Injectable()
export class ClassCancellationRefundBatchService {
  private readonly logger = new Logger(ClassCancellationRefundBatchService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly batchJobRunService: BatchJobRunService,
    private readonly checksService: ClassCancellationRefundChecksService,
    private readonly aiService: ClassCancellationRefundAiService,
    private readonly payoutService: ClassCancellationRefundPayoutService,
    @InjectRepository(ClassCancellationRefundRequestEntity)
    private readonly requestRepo: Repository<ClassCancellationRefundRequestEntity>,
  ) {}

  getDefaultBatchLimit(): number {
    const raw =
      this.configService.get<string>('CLASS_CANCELLATION_REFUND_BATCH_LIMIT') ||
      process.env.CLASS_CANCELLATION_REFUND_BATCH_LIMIT ||
      '30';
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 30;
  }

  async resetAiForPendingPayouts(): Promise<number> {
    const result = await this.requestRepo
      .createQueryBuilder()
      .update(ClassCancellationRefundRequestEntity)
      .set({
        aiStatus: ClassCancellationRefundAiStatusEnum.pending,
        aiSummary: null,
        aiRejectionReason: null,
        aiConfidence: null,
        aiAnalyzedAt: null,
        modelId: null,
        aiChecksJson: null,
        batchJobRunId: null,
      })
      .where('deleted = :deleted', { deleted: false })
      .andWhere('payoutStatus = :payoutPending', {
        payoutPending: ClassCancellationRefundPayoutStatusEnum.pending,
      })
      .andWhere('aiStatus != :aiPending', {
        aiPending: ClassCancellationRefundAiStatusEnum.pending,
      })
      .execute();
    return result.affected ?? 0;
  }

  async findPendingAiAnalysis(limit: number): Promise<ClassCancellationRefundRequestEntity[]> {
    return this.requestRepo.find({
      where: {
        deleted: false,
        aiStatus: ClassCancellationRefundAiStatusEnum.pending,
        payoutStatus: ClassCancellationRefundPayoutStatusEnum.pending,
      },
      relations: ['student', 'student.user', 'tutor', 'tutor.user', 'tutorOffering', 'tutorOffering.offering'],
      order: { id: 'ASC' },
      take: limit,
    });
  }

  async runBatch(options?: {
    reanalyzePendingPayouts?: boolean;
    triggeredBy?: BatchJobTriggerEnum;
  }): Promise<{
    resetForReanalysis: number;
    itemsFound: number;
    analyzed: number;
    gatewaySynced: number;
  }> {
    const triggeredBy = options?.triggeredBy ?? BatchJobTriggerEnum.CRON;
    let resetForReanalysis = 0;
    if (options?.reanalyzePendingPayouts) {
      resetForReanalysis = await this.resetAiForPendingPayouts();
    }

    const limit = this.getDefaultBatchLimit();
    const pending = await this.findPendingAiAnalysis(limit);
    const run = await this.batchJobRunService.startRun(
      BatchJobNameEnum.CLASS_CANCELLATION_REFUND_ANALYSIS,
      {
        triggeredBy,
        itemsFound: pending.length,
        metadata: { batchLimit: limit, resetForReanalysis },
      },
    );

    let analyzed = 0;
    let gatewaySynced = 0;

    try {
      for (const request of pending) {
        const checks = await this.checksService.runDeterministicChecks(request);
        const ai = await this.aiService.analyze({
          requestId: request.id,
          amountInr: request.amountInr,
          classCount: request.classCount,
          refundMethod: request.refundMethod,
          initiatedBy: request.initiatedBy,
          breakdown: request.refundBreakdownJson,
          checks,
        });
        request.aiStatus = ai.aiStatus;
        request.aiSummary = ai.aiSummary;
        request.aiRejectionReason = ai.aiRejectionReason;
        request.aiConfidence = ai.aiConfidence;
        request.modelId = ai.modelId;
        request.aiAnalyzedAt = new Date();
        request.batchJobRunId = run.id;
        request.aiChecksJson = checks as unknown as Record<string, unknown>;
        await this.requestRepo.save(request);
        analyzed += 1;
      }

      const processing = await this.payoutService.findProcessingGatewayRequests(limit);
      for (const request of processing) {
        const updated = await this.payoutService.syncGatewayRefundStatus(request.id);
        if (updated?.payoutStatus === ClassCancellationRefundPayoutStatusEnum.completed) {
          gatewaySynced += 1;
        }
      }

      await this.batchJobRunService.finishRun(
        run.id,
        {
          itemsFound: pending.length,
          itemsProcessed: analyzed + gatewaySynced,
          itemsSkipped: 0,
          itemsFailed: 0,
        },
        { analyzed, gatewaySynced, resetForReanalysis },
      );

      return {
        resetForReanalysis,
        itemsFound: pending.length,
        analyzed,
        gatewaySynced,
      };
    } catch (error) {
      this.logger.error(
        `Class cancellation refund batch failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await this.batchJobRunService.failRun(
        run.id,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
