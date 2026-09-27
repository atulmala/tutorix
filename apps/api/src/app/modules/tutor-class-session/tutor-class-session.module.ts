import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationModule } from '../communication/communication.module';
import { ProficiencyModule } from '../proficiency/proficiency.module';
import { StudentModule } from '../student/student.module';
import { TutorCalendar } from '../tutor-calendar/entities/tutor-calendar.entity';
import { TutorOfferingEntity } from '../tutor/entities/tutor-offering.entity';
import { TutorRateCardModule } from '../tutor-rate-card/tutor-rate-card.module';
import { WalletModule } from '../wallet/wallet.module';
import { TutorClassSessionEnrollmentEntity } from './entities/tutor-class-session-enrollment.entity';
import { TutorClassSessionEntity } from './entities/tutor-class-session.entity';
import { TutorClassSessionResolver } from './resolvers/tutor-class-session.resolver';
import { TutorClassSessionService } from './services/tutor-class-session.service';
import './enums/class-session-delivery-mode.enum';
import './enums/class-session-status.enum';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TutorClassSessionEntity,
      TutorClassSessionEnrollmentEntity,
      TutorCalendar,
      TutorOfferingEntity,
    ]),
    StudentModule,
    TutorRateCardModule,
    ProficiencyModule,
    WalletModule,
    CommunicationModule,
  ],
  providers: [TutorClassSessionService, TutorClassSessionResolver],
  exports: [TutorClassSessionService, TypeOrmModule],
})
export class TutorClassSessionModule {}
