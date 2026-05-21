import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DocumentModule } from '../modules/document/document.module';
import { BatchJobAuditModule } from './batch-job-audit.module';
import { DocumentScreeningBatchCron } from './document-screening/document-screening-batch.cron';

/**
 * Central module for scheduled batch jobs.
 * Add new job cron providers under batch-jobs/{job-name}/.
 */
@Module({
  imports: [ScheduleModule.forRoot(), BatchJobAuditModule, DocumentModule],
  providers: [DocumentScreeningBatchCron],
})
export class BatchJobsModule {}
