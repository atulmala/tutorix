import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { TutorOfferingEntity } from '../tutor/entities/tutor-offering.entity';
import { TutorRateCardModule } from '../tutor-rate-card/tutor-rate-card.module';
import { WalletModule } from '../wallet/wallet.module';
import './enums/class-credit-status.enum';
import './enums/class-credit-refund-method.enum';
import { ClassCreditCancellationEntity } from './entities/class-credit-cancellation.entity';
import { ClassCreditGatewayRefundEntity } from './entities/class-credit-gateway-refund.entity';
import { StudentCartItemEntity } from './entities/student-cart-item.entity';
import { StudentCartEntity } from './entities/student-cart.entity';
import { StudentClassCreditEntity } from './entities/student-class-credit.entity';
import { TutorClassEmailQueueEntity } from './entities/tutor-class-email-queue.entity';
import { StudentCartResolver } from './resolvers/student-cart.resolver';
import { StudentCartService } from './services/student-cart.service';
import { ClassCreditCancellationService } from './services/class-credit-cancellation.service';
import { StudentClassCreditService } from './services/student-class-credit.service';
import { TutorClassEmailBatchService } from './services/tutor-class-email-batch.service';
import { AdminClassBookingService } from './services/admin-class-booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentCartEntity,
      StudentCartItemEntity,
      StudentClassCreditEntity,
      ClassCreditCancellationEntity,
      ClassCreditGatewayRefundEntity,
      PaymentAttemptEntity,
      TutorOfferingEntity,
      TutorCalendar,
      TutorClassSessionEntity,
      TutorClassSessionEnrollmentEntity,
      OrderItemEntity,
      TutorClassEmailQueueEntity,
    ]),
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
    AdminClassBookingService,
    StudentCartResolver,
  ],
  exports: [
    StudentCartService,
    StudentClassCreditService,
    TutorClassEmailBatchService,
    AdminClassBookingService,
  ],
})
export class StudentCartModule {}
