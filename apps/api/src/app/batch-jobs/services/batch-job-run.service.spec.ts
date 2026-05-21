import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJobRunService } from './batch-job-run.service';
import { BatchJobRunEntity } from '../entities/batch-job-run.entity';
import { BatchJobNameEnum } from '../enums/batch-job-name.enum';
import { BatchJobRunStatusEnum } from '../enums/batch-job-run-status.enum';
import { BatchJobTriggerEnum } from '../enums/batch-job-trigger.enum';

describe('BatchJobRunService', () => {
  let service: BatchJobRunService;
  let save: jest.Mock;
  let findOne: jest.Mock;
  let create: jest.Mock;

  beforeEach(async () => {
    save = jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity }));
    findOne = jest.fn();
    create = jest.fn().mockImplementation((data) => data);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchJobRunService,
        {
          provide: getRepositoryToken(BatchJobRunEntity),
          useValue: { save, findOne, create } as Partial<Repository<BatchJobRunEntity>>,
        },
      ],
    }).compile();

    service = module.get(BatchJobRunService);
  });

  it('starts a run as RUNNING with job name and trigger', async () => {
    const run = await service.startRun(BatchJobNameEnum.DOCUMENT_ANALYSIS, {
      triggeredBy: BatchJobTriggerEnum.CRON,
      itemsFound: 5,
      metadata: { batchLimit: 20 },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: BatchJobNameEnum.DOCUMENT_ANALYSIS,
        status: BatchJobRunStatusEnum.RUNNING,
        triggeredBy: BatchJobTriggerEnum.CRON,
        itemsFound: 5,
        metadata: { batchLimit: 20 },
      }),
    );
    expect(save).toHaveBeenCalled();
    expect(run.jobName).toBe(BatchJobNameEnum.DOCUMENT_ANALYSIS);
  });

  it('finishes a run with SUCCESS when nothing skipped or failed', async () => {
    const startedAt = new Date('2026-01-01T10:00:00Z');
    findOne.mockResolvedValue({
      id: 42,
      startedAt,
      metadata: { batchLimit: 20 },
    });

    await service.finishRun(
      42,
      {
        itemsFound: 3,
        itemsProcessed: 3,
        itemsSkipped: 0,
        itemsFailed: 0,
      },
      { modelId: 'claude-sonnet-4-6' },
    );

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        status: BatchJobRunStatusEnum.SUCCESS,
        itemsFound: 3,
        itemsProcessed: 3,
        itemsSkipped: 0,
        itemsFailed: 0,
        durationMs: expect.any(Number),
        finishedAt: expect.any(Date),
        metadata: { batchLimit: 20, modelId: 'claude-sonnet-4-6' },
      }),
    );
  });

  it('finishes a run with PARTIAL when items were skipped', async () => {
    findOne.mockResolvedValue({
      id: 7,
      startedAt: new Date(),
    });

    await service.finishRun(7, {
      itemsFound: 2,
      itemsProcessed: 1,
      itemsSkipped: 1,
      itemsFailed: 0,
    });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: BatchJobRunStatusEnum.PARTIAL,
        itemsSkipped: 1,
      }),
    );
  });

  it('marks a run as FAILED with error message', async () => {
    findOne.mockResolvedValue({
      id: 9,
      startedAt: new Date(),
      itemsFound: 0,
      itemsProcessed: 0,
      itemsSkipped: 0,
      itemsFailed: 0,
    });

    await service.failRun(9, 'S3 bucket not configured', {
      itemsFound: 2,
      itemsProcessed: 1,
      itemsSkipped: 0,
      itemsFailed: 0,
    });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 9,
        status: BatchJobRunStatusEnum.FAILED,
        errorMessage: 'S3 bucket not configured',
        itemsFound: 2,
        itemsProcessed: 1,
      }),
    );
  });
});
