import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchJobAuditModule } from '../../batch-jobs/batch-job-audit.module';
import { Tutor } from '../tutor/entities/tutor.entity';
import { User } from '../auth/entities/user.entity';
import { DocumentEntity } from './entities/document.entity';
import { DocumentScreeningEntity } from './entities/document-screening.entity';
import {
  DocumentUploadResolver,
  TutorDocumentsFieldResolver,
} from './resolvers/document.resolver';
import { DocumentEntityResolver } from './resolvers/document-entity.resolver';
import { DocumentService } from './services/document.service';
import { DocumentScreeningAiService } from './services/document-screening-ai.service';
import { DocumentScreeningBatchService } from './services/document-screening-batch.service';
import { DocumentScreeningService } from './services/document-screening.service';
import { TutorOnboardingDocumentEligibilityService } from './services/tutor-onboarding-document-eligibility.service';

@Module({
  imports: [
    ConfigModule,
    BatchJobAuditModule,
    TypeOrmModule.forFeature([
      DocumentEntity,
      DocumentScreeningEntity,
      Tutor,
      User,
    ]),
  ],
  providers: [
    DocumentService,
    DocumentScreeningAiService,
    DocumentScreeningBatchService,
    DocumentScreeningService,
    TutorOnboardingDocumentEligibilityService,
    DocumentUploadResolver,
    TutorDocumentsFieldResolver,
    DocumentEntityResolver,
  ],
  exports: [
    DocumentService,
    DocumentScreeningAiService,
    DocumentScreeningBatchService,
    DocumentScreeningService,
    TutorOnboardingDocumentEligibilityService,
    TypeOrmModule,
  ],
})
export class DocumentModule {}
