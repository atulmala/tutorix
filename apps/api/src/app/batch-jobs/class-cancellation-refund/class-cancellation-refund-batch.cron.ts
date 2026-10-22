import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ClassCancellationRefundBatchService } from '../../modules/student-cart/services/class-cancellation-refund-batch.service';

@Injectable()
export class ClassCancellationRefundBatchCron {
  private readonly logger = new Logger(ClassCancellationRefundBatchCron.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly batchService: ClassCancellationRefundBatchService,
  ) {}

  private isEnabled(): boolean {
    const flag =
      this.configService.get<string>('CLASS_CANCELLATION_REFUND_BATCH_ENABLED') ||
      process.env.CLASS_CANCELLATION_REFUND_BATCH_ENABLED ||
      '';
    return flag.toLowerCase() === 'true';
  }

  @Cron(process.env.CLASS_CANCELLATION_REFUND_BATCH_CRON ?? CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    if (this.running) {
      this.logger.warn('Class cancellation refund batch already running — skipping tick');
      return;
    }

    this.running = true;
    try {
      await this.batchService.runBatch();
    } catch (err) {
      this.logger.error(`Class cancellation refund batch failed: ${err}`);
    } finally {
      this.running = false;
    }
  }
}
