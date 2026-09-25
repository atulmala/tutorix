import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommerceModule } from '../commerce/commerce.module';
import { CommunicationModule } from '../communication/communication.module';
import { OrderItemEntity } from '../commerce/entities/order-item.entity';
import { ProficiencyModule } from '../proficiency/proficiency.module';
import { StudentModule } from '../student/student.module';
import { TutorCalendar } from '../tutor-calendar/entities/tutor-calendar.entity';
import { TutorClassSessionEnrollmentEntity } from '../tutor-class-session/entities/tutor-class-session-enrollment.entity';
import { TutorClassSessionEntity } from '../tutor-class-session/entities/tutor-class-session.entity';
import { TutorOfferingEntity } from '../tutor/entities/tutor-offering.entity';
import { TutorRateCardModule } from '../tutor-rate-card/tutor-rate-card.module';
import { WalletModule } from '../wallet/wallet.module';
import './enums/class-credit-status.enum';
import { StudentCartItemEntity } from './entities/student-cart-item.entity';
import { StudentCartEntity } from './entities/student-cart.entity';
import { StudentClassCreditEntity } from './entities/student-class-credit.entity';
import { StudentCartResolver } from './resolvers/student-cart.resolver';
import { StudentCartService } from './services/student-cart.service';
import { StudentClassCreditService } from './services/student-class-credit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentCartEntity,
      StudentCartItemEntity,
      StudentClassCreditEntity,
      TutorOfferingEntity,
      TutorCalendar,
      TutorClassSessionEntity,
      TutorClassSessionEnrollmentEntity,
      OrderItemEntity,
    ]),
    StudentModule,
    TutorRateCardModule,
    ProficiencyModule,
    CommunicationModule,
    forwardRef(() => CommerceModule),
    forwardRef(() => WalletModule),
  ],
  providers: [StudentCartService, StudentClassCreditService, StudentCartResolver],
  exports: [StudentCartService, StudentClassCreditService],
})
export class StudentCartModule {}
