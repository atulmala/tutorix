import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PaymentSettlementBatchService } from '../../modules/commerce/services/payment-settlement-batch.service';

@Injectable()
export class PaymentSettlementBatchCron {
  private readonly logger = new Logger(PaymentSettlementBatchCron.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly batchService: PaymentSettlementBatchService,
  ) {}

  private isEnabled(): boolean {
    const flag =
      this.configService.get<string>('PAYMENT_SETTLEMENT_BATCH_ENABLED') ||
      process.env.PAYMENT_SETTLEMENT_BATCH_ENABLED ||
      '';
    return flag.toLowerCase() === 'true';
  }

  @Cron(process.env.PAYMENT_SETTLEMENT_BATCH_CRON ?? CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    if (this.running) {
      this.logger.warn('Payment settlement batch already running — skipping tick');
      return;
    }

    this.running = true;
    try {
      await this.batchService.runBatch();
    } catch (err) {
      this.logger.error(`Payment settlement batch failed: ${err}`);
    } finally {
      this.running = false;
    }
  }
}
