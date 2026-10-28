import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchJobAuditModule } from '../../batch-jobs/batch-job-audit.module';
import { AuthModule } from '../auth/auth.module';
import { CommerceModule } from '../commerce/commerce.module';
import { CommunicationModule } from '../communication/communication.module';
import { OrderItemEntity } from '../commerce/entities/order-item.entity';
import { PaymentAttemptEntity } from '../commerce/entities/payment-attempt.entity';
import { OfferingsModule } from '../offerings/offerings.module';
import { PaymentModule } from '../payment/payment.module';
import { ProficiencyModule } from '../proficiency/proficiency.module';
import { StudentModule } from '../student/student.module';
import { TutorCalendar } from '../tutor-calendar/entities/tutor-calendar.entity';
import { TutorClassSessionEnrollmentEntity } from '../tutor-class-session/entities/tutor-class-session-enrollment.entity';
import { TutorClassSessionEntity } from '../tutor-class-session/entities/tutor-class-session.entity';
import { Tutor } from '../tutor/entities/tutor.entity';
import { TutorOfferingEntity } from '../tutor/entities/tutor-offering.entity';
import { TutorRateCardModule } from '../tutor-rate-card/tutor-rate-card.module';
import { WalletModule } from '../wallet/wallet.module';
import './enums/class-credit-status.enum';
import './enums/class-credit-refund-method.enum';
import './enums/class-cancellation-refund-initiated-by.enum';
import './enums/class-cancellation-refund-payout-status.enum';
import './enums/class-cancellation-refund-ai-status.enum';
import './enums/tutor-booking-status.enum';
import './enums/post-class-refund-claim-reason.enum';
import './enums/post-class-refund-claim-method.enum';
import './enums/post-class-refund-tutor-response-status.enum';
import './enums/post-class-refund-admin-status.enum';
import './enums/post-class-refund-claim-student-status.enum';
import { ClassCancellationRefundRequestEntity } from './entities/class-cancellation-refund-request.entity';
import { PostClassRefundClaimEntity } from './entities/post-class-refund-claim.entity';
import { ClassCreditCancellationEntity } from './entities/class-credit-cancellation.entity';
import { ClassCreditGatewayRefundEntity } from './entities/class-credit-gateway-refund.entity';
import { StudentCartItemEntity } from './entities/student-cart-item.entity';
import { StudentCartEntity } from './entities/student-cart.entity';
import { StudentClassCreditEntity } from './entities/student-class-credit.entity';
import { TutorClassEmailQueueEntity } from './entities/tutor-class-email-queue.entity';
import { PostClassRefundClaimResolver } from './resolvers/post-class-refund-claim.resolver';
import { StudentCartResolver } from './resolvers/student-cart.resolver';
import { AdminPostClassRefundClaimService } from './services/admin-post-class-refund-claim.service';
import { PostClassRefundClaimService } from './services/post-class-refund-claim.service';
import { AdminClassCancellationRefundService } from './services/admin-class-cancellation-refund.service';
import { AdminClassBookingService } from './services/admin-class-booking.service';
import { ClassCancellationRefundAiService } from './services/class-cancellation-refund-ai.service';
import { ClassCancellationRefundBatchService } from './services/class-cancellation-refund-batch.service';
import { ClassCancellationRefundChecksService } from './services/class-cancellation-refund-checks.service';
import { ClassCancellationRefundPayoutService } from './services/class-cancellation-refund-payout.service';
import { ClassCancellationRefundRequestService } from './services/class-cancellation-refund-request.service';
import { ClassCreditCancellationService } from './services/class-credit-cancellation.service';
import { StudentCartService } from './services/student-cart.service';
import { StudentClassCreditService } from './services/student-class-credit.service';
import { TutorClassBookingService } from './services/tutor-class-booking.service';
import { TutorClassEmailBatchService } from './services/tutor-class-email-batch.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentCartEntity,
      StudentCartItemEntity,
      StudentClassCreditEntity,
      ClassCreditCancellationEntity,
      ClassCreditGatewayRefundEntity,
      ClassCancellationRefundRequestEntity,
      PostClassRefundClaimEntity,
      PaymentAttemptEntity,
      OrderItemEntity,
      Tutor,
      TutorOfferingEntity,
      TutorCalendar,
      TutorClassSessionEntity,
      TutorClassSessionEnrollmentEntity,
      TutorClassEmailQueueEntity,
    ]),
    ConfigModule,
    BatchJobAuditModule,
    forwardRef(() => AuthModule),
    StudentModule,
    OfferingsModule,
    TutorRateCardModule,
    ProficiencyModule,
    CommunicationModule,
    forwardRef(() => CommerceModule),
    forwardRef(() => WalletModule),
    forwardRef(() => PaymentModule),
  ],
  providers: [
    StudentCartService,
    StudentClassCreditService,
    TutorClassEmailBatchService,
    ClassCreditCancellationService,
    ClassCancellationRefundRequestService,
    ClassCancellationRefundChecksService,
    ClassCancellationRefundPayoutService,
    ClassCancellationRefundAiService,
    ClassCancellationRefundBatchService,
    AdminClassBookingService,
    AdminClassCancellationRefundService,
    TutorClassBookingService,
    PostClassRefundClaimService,
    AdminPostClassRefundClaimService,
    StudentCartResolver,
    PostClassRefundClaimResolver,
  ],
  exports: [
    PostClassRefundClaimService,
    StudentCartService,
    StudentClassCreditService,
    TutorClassEmailBatchService,
    AdminClassBookingService,
    AdminClassCancellationRefundService,
    ClassCancellationRefundPayoutService,
    ClassCancellationRefundBatchService,
  ],
})
export class StudentCartModule {}
