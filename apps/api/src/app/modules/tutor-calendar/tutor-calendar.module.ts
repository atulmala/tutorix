import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tutor } from '../tutor/entities/tutor.entity';
import { TutorOfferingEntity } from '../tutor/entities/tutor-offering.entity';
import { TutorRateCardModule } from '../tutor-rate-card/tutor-rate-card.module';
import { TutorCalendar } from './entities/tutor-calendar.entity';
import { TutorCalendarResolver } from './resolvers/tutor-calendar.resolver';
import { TutorCalendarService } from './services/tutor-calendar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TutorCalendar, Tutor, TutorOfferingEntity]),
    TutorRateCardModule,
  ],
  providers: [TutorCalendarService, TutorCalendarResolver],
  exports: [TutorCalendarService],
})
export class TutorCalendarModule {}
