import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DocumentModule } from '../modules/document/document.module';
import { TutorModule } from '../modules/tutor/tutor.module';
import { CommerceModule } from '../modules/commerce/commerce.module';
import { BatchJobAuditModule } from './batch-job-audit.module';
import { DocumentScreeningBatchCron } from './document-screening/document-screening-batch.cron';
import { TutorOnboardingApprovalBatchCron } from './tutor-onboarding-approval/tutor-onboarding-approval-batch.cron';
import { PaymentSettlementBatchCron } from './payment-settlement/payment-settlement-batch.cron';

/**
 * Central module for scheduled batch jobs.
 * Add new job cron providers under batch-jobs/{job-name}/.
 */
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    BatchJobAuditModule,
    DocumentModule,
    TutorModule,
    CommerceModule,
  ],
  providers: [
    DocumentScreeningBatchCron,
    TutorOnboardingApprovalBatchCron,
    PaymentSettlementBatchCron,
  ],
})
export class BatchJobsModule {}
