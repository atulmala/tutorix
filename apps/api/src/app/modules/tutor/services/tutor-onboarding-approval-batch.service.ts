import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJobNameEnum } from '../../../batch-jobs/enums/batch-job-name.enum';
import { BatchJobTriggerEnum } from '../../../batch-jobs/enums/batch-job-trigger.enum';
import { BatchJobRunService } from '../../../batch-jobs/services/batch-job-run.service';
import { TutorOnboardingDocumentEligibilityService } from '../../document/services/tutor-onboarding-document-eligibility.service';
import { TutorCertificationStageEnum } from '../enums/tutor.enums';
import { Tutor } from '../entities/tutor.entity';
import { TutorOnboardingService } from './tutor-onboarding.service';

@Injectable()
export class TutorOnboardingApprovalBatchService {
  private readonly logger = new Logger(TutorOnboardingApprovalBatchService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly batchJobRunService: BatchJobRunService,
    private readonly documentEligibility: TutorOnboardingDocumentEligibilityService,
    private readonly tutorOnboardingService: TutorOnboardingService,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
  ) {}

  getDefaultBatchLimit(): number {
    const raw =
      this.configService.get<string>('TUTOR_APPROVAL_BATCH_LIMIT') ||
      process.env.TUTOR_APPROVAL_BATCH_LIMIT ||
      '20';
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 20;
  }

  async findInterviewTutors(limit: number): Promise<Tutor[]> {
    return this.tutorRepo.find({
      where: {
        certificationStage: TutorCertificationStageEnum.interview,
        onBoardingComplete: false,
        deleted: false,
      },
      order: { id: 'ASC' },
      take: limit,
    });
  }

  async runBatch(
    limit?: number,
    triggeredBy: BatchJobTriggerEnum = BatchJobTriggerEnum.CRON,
  ): Promise<{ processed: number; skipped: number; batchJobRunId?: number }> {
    const batchLimit = limit ?? this.getDefaultBatchLimit();
    const candidates = await this.findInterviewTutors(batchLimit);

    if (candidates.length === 0) {
      this.logger.debug('No tutors in interview stage to evaluate for approval');
      return { processed: 0, skipped: 0 };
    }

    const run = await this.batchJobRunService.startRun(
      BatchJobNameEnum.TUTOR_ONBOARDING_APPROVAL,
      {
        triggeredBy,
        itemsFound: candidates.length,
        metadata: { batchLimit },
      },
    );

    let processed = 0;
    let skipped = 0;
    const approvedTutorIds: number[] = [];

    try {
      for (const tutor of candidates) {
        const passed =
          await this.documentEligibility.hasPassedAllOnboardingDocuments(
            tutor.id,
          );
        if (!passed) {
          skipped += 1;
          continue;
        }

        try {
          await this.tutorOnboardingService.approveTutorOnboarding(tutor);
          approvedTutorIds.push(tutor.id);
          processed += 1;
          this.logger.log(`Approved tutor onboarding tutorId=${tutor.id}`);
        } catch (err) {
          skipped += 1;
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Skipped tutor ${tutor.id} during approval batch: ${message}`,
          );
        }
      }

      await this.batchJobRunService.finishRun(
        run.id,
        {
          itemsFound: candidates.length,
          itemsProcessed: processed,
          itemsSkipped: skipped,
          itemsFailed: 0,
        },
        { approvedTutorIds },
      );

      this.logger.log(
        `Tutor approval batch ${run.id} finished — approved=${processed} skipped=${skipped}`,
      );
      return { processed, skipped, batchJobRunId: run.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.batchJobRunService.failRun(run.id, message, {
        itemsFound: candidates.length,
        itemsProcessed: processed,
        itemsSkipped: skipped,
        itemsFailed: 0,
      });
      throw err;
    }
  }
}
