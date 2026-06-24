import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJobNameEnum } from '../../../batch-jobs/enums/batch-job-name.enum';
import { BatchJobTriggerEnum } from '../../../batch-jobs/enums/batch-job-trigger.enum';
import { BatchJobRunService } from '../../../batch-jobs/services/batch-job-run.service';
import { PaymentGatewayProviderEnum } from '../../payment/enums/payment.enums';
import { RazorpayGateway } from '../../payment/services/payment-gateways';
import { PaymentAttemptEntity } from '../entities/payment-attempt.entity';
import { PaymentAttemptStatusEnum } from '../enums/commerce.enums';

export type SettlementSyncOutcome = 'updated' | 'pending' | 'failed';

@Injectable()
export class PaymentSettlementBatchService {
  private readonly logger = new Logger(PaymentSettlementBatchService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly razorpayGateway: RazorpayGateway,
    private readonly batchJobRunService: BatchJobRunService,
    @InjectRepository(PaymentAttemptEntity)
    private readonly paymentAttemptRepo: Repository<PaymentAttemptEntity>,
  ) {}

  getDefaultBatchLimit(): number {
    const raw =
      this.configService.get<string>('PAYMENT_SETTLEMENT_BATCH_LIMIT') ||
      process.env.PAYMENT_SETTLEMENT_BATCH_LIMIT ||
      '50';
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 50;
  }

  async findAttemptsNeedingSettlement(limit: number): Promise<PaymentAttemptEntity[]> {
    return this.paymentAttemptRepo
      .createQueryBuilder('attempt')
      .where('attempt.deleted = false')
      .andWhere('attempt.status = :status', {
        status: PaymentAttemptStatusEnum.paid,
      })
      .andWhere('attempt.provider = :provider', {
        provider: PaymentGatewayProviderEnum.razorpay,
      })
      .andWhere('attempt.gateway_payment_id IS NOT NULL')
      .andWhere(
        '(attempt.gateway_settlement_id IS NULL OR attempt.settlement_utr IS NULL)',
      )
      .orderBy('attempt.id', 'ASC')
      .limit(limit)
      .getMany();
  }

  async syncAttemptSettlement(
    attempt: PaymentAttemptEntity,
  ): Promise<SettlementSyncOutcome> {
    if (!attempt.gatewayPaymentId) {
      return 'failed';
    }

    if (
      attempt.gatewaySettlementId &&
      attempt.settlementUtr &&
      attempt.settledAt
    ) {
      return 'updated';
    }

    let details;
    if (attempt.gatewaySettlementId && !attempt.settlementUtr) {
      details = await this.razorpayGateway.fetchSettlementDetails(
        attempt.gatewaySettlementId,
      );
    } else {
      details = await this.razorpayGateway.fetchSettlementForPayment(
        attempt.gatewayPaymentId,
      );
    }

    if (!details) {
      return 'pending';
    }

    attempt.gatewaySettlementId = details.settlementId;
    if (details.utr) {
      attempt.settlementUtr = details.utr;
    }
    if (details.settledAt) {
      attempt.settledAt = details.settledAt;
    } else if (!attempt.settledAt) {
      attempt.settledAt = new Date();
    }

    await this.paymentAttemptRepo.save(attempt);
    return 'updated';
  }

  async runBatch(): Promise<void> {
    if (!this.razorpayGateway.isConfigured()) {
      this.logger.debug('Razorpay not configured — skipping payment settlement batch');
      return;
    }

    const limit = this.getDefaultBatchLimit();
    const attempts = await this.findAttemptsNeedingSettlement(limit);

    const run = await this.batchJobRunService.startRun(
      BatchJobNameEnum.PAYMENT_SETTLEMENT_SYNC,
      {
        triggeredBy: BatchJobTriggerEnum.CRON,
        metadata: { batchLimit: limit },
        itemsFound: attempts.length,
      },
    );

    let itemsProcessed = 0;
    let itemsSkipped = 0;
    let itemsFailed = 0;

    for (const attempt of attempts) {
      try {
        const outcome = await this.syncAttemptSettlement(attempt);
        if (outcome === 'updated') {
          itemsProcessed += 1;
        } else if (outcome === 'pending') {
          itemsSkipped += 1;
        } else {
          itemsFailed += 1;
        }
      } catch (error) {
        itemsFailed += 1;
        this.logger.warn(
          `Settlement sync failed for payment attempt ${attempt.id}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    await this.batchJobRunService.finishRun(run.id, {
      itemsFound: attempts.length,
      itemsProcessed,
      itemsSkipped,
      itemsFailed,
    });

    this.logger.log(
      `Payment settlement batch complete: found=${attempts.length} updated=${itemsProcessed} pending=${itemsSkipped} failed=${itemsFailed}`,
    );
  }
}
