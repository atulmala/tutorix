import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { TutorOnboardingApprovalBatchService } from '../../modules/tutor/services/tutor-onboarding-approval-batch.service';

@Injectable()
export class TutorOnboardingApprovalBatchCron {
  private readonly logger = new Logger(TutorOnboardingApprovalBatchCron.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly batchService: TutorOnboardingApprovalBatchService,
  ) {}

  private isEnabled(): boolean {
    const flag =
      this.configService.get<string>('TUTOR_APPROVAL_BATCH_ENABLED') ||
      process.env.TUTOR_APPROVAL_BATCH_ENABLED ||
      '';
    return flag.toLowerCase() === 'true';
  }

  @Cron(process.env.TUTOR_APPROVAL_BATCH_CRON ?? CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    if (this.running) {
      this.logger.warn('Tutor approval batch already running — skipping tick');
      return;
    }

    this.running = true;
    try {
      await this.batchService.runBatch();
    } catch (err) {
      this.logger.error(`Tutor onboarding approval batch failed: ${err}`);
    } finally {
      this.running = false;
    }
  }
}
