import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchJobAuditModule } from '../../batch-jobs/batch-job-audit.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentModule } from '../document/document.module';
import { Tutor } from './entities/tutor.entity';
import { TutorQualificationEntity } from './entities/tutor-qualification.entity';
import { TutorOfferingEntity } from './entities/tutor-offering.entity';
import { TutorOfferingPtFeeEntity } from './entities/tutor-offering-pt-fee.entity';
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
import { TutorCalendarModule } from '../tutor-calendar/tutor-calendar.module';
import { TutorDetailService } from './services/tutor-detail.service';
import { TutorAddOfferingService } from './services/tutor-add-offering.service';
import { TutorOfferingPtFeeService } from './services/tutor-offering-pt-fee.service';
import { NoOpPtPaymentService } from './services/pt-payment.service';
import { OfferingsModule } from '../offerings/offerings.module';

@Module({
  imports: [
    ConfigModule,
    BatchJobAuditModule,
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([
      Tutor,
      TutorQualificationEntity,
      TutorOfferingEntity,
      TutorOfferingPtFeeEntity,
    ]),
    DocumentModule,
    ProficiencyModule,
    forwardRef(() => ExperienceModule),
    UserBankDetailsModule,
    TutorRateCardModule,
    TutorCalendarModule,
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
    TutorAddOfferingService,
    TutorOfferingPtFeeService,
    NoOpPtPaymentService,
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
