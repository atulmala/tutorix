import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DocumentScreeningBatchService } from '../../modules/document/services/document-screening-batch.service';

@Injectable()
export class DocumentScreeningBatchCron {
  private readonly logger = new Logger(DocumentScreeningBatchCron.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly batchService: DocumentScreeningBatchService,
  ) {}

  private isEnabled(): boolean {
    const flag =
      this.configService.get<string>('DOCUMENT_SCREENING_BATCH_ENABLED') ||
      process.env.DOCUMENT_SCREENING_BATCH_ENABLED ||
      '';
    return flag.toLowerCase() === 'true';
  }

  @Cron(process.env.DOCUMENT_SCREENING_BATCH_CRON ?? CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    if (this.running) {
      this.logger.warn('Document screening batch already running — skipping tick');
      return;
    }

    this.running = true;
    try {
      await this.batchService.runBatch();
    } catch (err) {
      this.logger.error(`Document screening batch failed: ${err}`);
    } finally {
      this.running = false;
    }
  }
}
