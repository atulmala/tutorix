import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchJobAuditModule } from '../../batch-jobs/batch-job-audit.module';
import { DocumentModule } from '../document/document.module';
import { Tutor } from './entities/tutor.entity';
import { TutorQualificationEntity } from './entities/tutor-qualification.entity';
import { TutorOfferingEntity } from './entities/tutor-offering.entity';
import { TutorResolver } from './resolvers/tutor.resolver';
import { TutorService } from './services/tutor.service';
import { TutorQualificationService } from './services/tutor-qualification.service';
import { TutorOfferingService } from './services/tutor-offering.service';
import { TutorOnboardingService } from './services/tutor-onboarding.service';
import { TutorOnboardingApprovalBatchService } from './services/tutor-onboarding-approval-batch.service';
import { ProficiencyModule } from '../proficiency/proficiency.module';
import { ExperienceModule } from '../experience/experience.module';
import { UserBankDetailsModule } from '../user-bank-details/user-bank-details.module';
import { TutorRateCardModule } from '../tutor-rate-card/tutor-rate-card.module';
import { TutorDetailService } from './services/tutor-detail.service';
import { OfferingsModule } from '../offerings/offerings.module';

@Module({
  imports: [
    ConfigModule,
    BatchJobAuditModule,
    TypeOrmModule.forFeature([Tutor, TutorQualificationEntity, TutorOfferingEntity]),
    DocumentModule,
    ProficiencyModule,
    forwardRef(() => ExperienceModule),
    UserBankDetailsModule,
    TutorRateCardModule,
    OfferingsModule,
  ],
  providers: [
    TutorResolver,
    TutorService,
    TutorQualificationService,
    TutorOfferingService,
    TutorOnboardingService,
    TutorOnboardingApprovalBatchService,
    TutorDetailService,
  ],
  exports: [
    TutorService,
    TutorQualificationService,
    TutorOfferingService,
    TutorOnboardingService,
    TutorOnboardingApprovalBatchService,
    TutorDetailService,
  ],
})
export class TutorModule {}
