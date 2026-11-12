import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJobNameEnum } from '../../../batch-jobs/enums/batch-job-name.enum';
import { BatchJobTriggerEnum } from '../../../batch-jobs/enums/batch-job-trigger.enum';
import { BatchJobRunService } from '../../../batch-jobs/services/batch-job-run.service';
import { PaymentGatewayProviderEnum } from '../../payment/enums/payment.enums';
import { CashfreeGateway } from '../../payment/services/payment-gateways';
import { PaymentAttemptEntity } from '../entities/payment-attempt.entity';
import { PaymentAttemptStatusEnum } from '../enums/commerce.enums';
import {
  PaymentSettlementBatchService,
  SettlementSyncOutcome,
} from './payment-settlement-batch.service';

@Injectable()
export class CashfreeSettlementBatchService {
  private readonly logger = new Logger(CashfreeSettlementBatchService.name);

  constructor(
    private readonly cashfreeGateway: CashfreeGateway,
    private readonly paymentSettlementBatchService: PaymentSettlementBatchService,
    private readonly batchJobRunService: BatchJobRunService,
    @InjectRepository(PaymentAttemptEntity)
    private readonly paymentAttemptRepo: Repository<PaymentAttemptEntity>,
  ) {}

  async findAttemptsNeedingSettlement(limit: number): Promise<PaymentAttemptEntity[]> {
    return this.paymentAttemptRepo
      .createQueryBuilder('attempt')
      .where('attempt.deleted = false')
      .andWhere('attempt.status = :status', {
        status: PaymentAttemptStatusEnum.paid,
      })
      .andWhere('attempt.provider = :provider', {
        provider: PaymentGatewayProviderEnum.cashfree,
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
    if (attempt.gatewaySettlementId && attempt.settlementUtr && attempt.settledAt) {
      return 'updated';
    }

    const details = await this.cashfreeGateway.fetchSettlementForOrder(
      attempt.gatewayOrderId,
    );
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
    if (!this.cashfreeGateway.isConfigured()) {
      this.logger.debug('Cashfree not configured — skipping Cashfree settlement batch');
      return;
    }

    const limit = this.paymentSettlementBatchService.getDefaultBatchLimit();
    const attempts = await this.findAttemptsNeedingSettlement(limit);
    if (attempts.length === 0) {
      return;
    }

    const run = await this.batchJobRunService.startRun(
      BatchJobNameEnum.PAYMENT_SETTLEMENT_SYNC,
      {
        triggeredBy: BatchJobTriggerEnum.CRON,
        metadata: { batchLimit: limit, provider: PaymentGatewayProviderEnum.cashfree },
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
          `Cashfree settlement sync failed for payment attempt ${attempt.id}: ${
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
      `Cashfree settlement batch complete: found=${attempts.length} updated=${itemsProcessed} pending=${itemsSkipped} failed=${itemsFailed}`,
    );
  }
}
