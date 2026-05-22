import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJobRunEntity } from '../entities/batch-job-run.entity';
import { BatchJobNameEnum } from '../enums/batch-job-name.enum';
import { BatchJobRunStatusEnum } from '../enums/batch-job-run-status.enum';
import { BatchJobTriggerEnum } from '../enums/batch-job-trigger.enum';

export interface BatchJobRunStats {
  itemsFound: number;
  itemsProcessed: number;
  itemsSkipped: number;
  itemsFailed: number;
}

export interface StartBatchJobRunOptions {
  triggeredBy?: BatchJobTriggerEnum;
  metadata?: Record<string, unknown>;
  itemsFound?: number;
}

function resolveFinalStatus(stats: BatchJobRunStats): BatchJobRunStatusEnum {
  if (stats.itemsSkipped > 0 || stats.itemsFailed > 0) {
    return BatchJobRunStatusEnum.PARTIAL;
  }
  return BatchJobRunStatusEnum.SUCCESS;
}

@Injectable()
export class BatchJobRunService {
  constructor(
    @InjectRepository(BatchJobRunEntity)
    private readonly batchJobRunRepo: Repository<BatchJobRunEntity>,
  ) {}

  async startRun(
    jobName: BatchJobNameEnum,
    options: StartBatchJobRunOptions = {},
  ): Promise<BatchJobRunEntity> {
    const run = this.batchJobRunRepo.create({
      jobName,
      status: BatchJobRunStatusEnum.RUNNING,
      startedAt: new Date(),
      triggeredBy: options.triggeredBy ?? BatchJobTriggerEnum.CRON,
      metadata: options.metadata,
      itemsFound: options.itemsFound ?? 0,
      itemsProcessed: 0,
      itemsSkipped: 0,
      itemsFailed: 0,
    });
    return this.batchJobRunRepo.save(run);
  }

  async finishRun(
    runId: number,
    stats: BatchJobRunStats,
    metadata?: Record<string, unknown>,
  ): Promise<BatchJobRunEntity> {
    const finishedAt = new Date();
    const run = await this.batchJobRunRepo.findOne({ where: { id: runId } });
    if (!run) {
      throw new Error(`Batch job run ${runId} not found`);
    }

    const durationMs = finishedAt.getTime() - run.startedAt.getTime();
    run.finishedAt = finishedAt;
    run.durationMs = durationMs;
    run.status = resolveFinalStatus(stats);
    run.itemsFound = stats.itemsFound;
    run.itemsProcessed = stats.itemsProcessed;
    run.itemsSkipped = stats.itemsSkipped;
    run.itemsFailed = stats.itemsFailed;
    if (metadata) {
      run.metadata = { ...(run.metadata ?? {}), ...metadata };
    }

    return this.batchJobRunRepo.save(run);
  }

  async failRun(
    runId: number,
    errorMessage: string,
    stats?: Partial<BatchJobRunStats>,
  ): Promise<BatchJobRunEntity> {
    const finishedAt = new Date();
    const run = await this.batchJobRunRepo.findOne({ where: { id: runId } });
    if (!run) {
      throw new Error(`Batch job run ${runId} not found`);
    }

    run.finishedAt = finishedAt;
    run.durationMs = finishedAt.getTime() - run.startedAt.getTime();
    run.status = BatchJobRunStatusEnum.FAILED;
    run.errorMessage = errorMessage.slice(0, 2000);
    if (stats) {
      run.itemsFound = stats.itemsFound ?? run.itemsFound;
      run.itemsProcessed = stats.itemsProcessed ?? run.itemsProcessed;
      run.itemsSkipped = stats.itemsSkipped ?? run.itemsSkipped;
      run.itemsFailed = stats.itemsFailed ?? run.itemsFailed;
    }

    return this.batchJobRunRepo.save(run);
  }
}
