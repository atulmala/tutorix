import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { TutorClassEmailBatchService } from '../../modules/student-cart/services/tutor-class-email-batch.service';

@Injectable()
export class TutorClassEmailBatchCron {
  private readonly logger = new Logger(TutorClassEmailBatchCron.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly batchService: TutorClassEmailBatchService,
  ) {}

  private isEnabled(): boolean {
    const flag =
      this.configService.get<string>('TUTOR_CLASS_EMAIL_BATCH_ENABLED') ||
      process.env.TUTOR_CLASS_EMAIL_BATCH_ENABLED ||
      'true';
    return flag.toLowerCase() !== 'false';
  }

  @Cron(process.env.TUTOR_CLASS_EMAIL_BATCH_CRON ?? CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    if (this.running) {
      this.logger.warn('Tutor class email batch already running — skipping tick');
      return;
    }

    this.running = true;
    try {
      await this.batchService.sendHourlyBatch();
    } catch (err) {
      this.logger.error(`Tutor class email batch failed: ${err}`);
    } finally {
      this.running = false;
    }
  }
}
