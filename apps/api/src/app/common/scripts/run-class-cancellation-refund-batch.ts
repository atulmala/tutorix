#!/usr/bin/env ts-node
/**
 * Run class cancellation refund AI analysis batch (same logic as cron / admin mutation).
 *
 * Usage:
 *   npm run batch:class-cancellation-refund
 *   npm run batch:class-cancellation-refund -- --no-reanalyze
 */

import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ClassCancellationRefundBatchService } from '../../modules/student-cart/services/class-cancellation-refund-batch.service';
import { BatchJobTriggerEnum } from '../../batch-jobs/enums/batch-job-trigger.enum';

async function main(): Promise<void> {
  const reanalyze = !process.argv.includes('--no-reanalyze');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const batch = app.get(ClassCancellationRefundBatchService);
    const result = await batch.runBatch({
      reanalyzePendingPayouts: reanalyze,
      triggeredBy: BatchJobTriggerEnum.MANUAL,
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
