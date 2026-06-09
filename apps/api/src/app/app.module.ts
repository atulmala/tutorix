import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphqlModule } from './graphql/graphql.module';
import { AppResolver } from './graphql/resolvers/app.resolver';
import { DatabaseModule } from './database/database.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { TutorModule } from './modules/tutor/tutor.module';
import { AddressModule } from './modules/address/address.module';
import { DocumentModule } from './modules/document/document.module';
import { ExperienceModule } from './modules/experience/experience.module';
import { OfferingsModule } from './modules/offerings/offerings.module';
import { ProficiencyModule } from './modules/proficiency/proficiency.module';
import { BatchJobsModule } from './batch-jobs/batch-jobs.module';
import { AdminModule } from './modules/admin/admin.module';
import { UserBankDetailsModule } from './modules/user-bank-details/user-bank-details.module';
import { TutorRateCardModule } from './modules/tutor-rate-card/tutor-rate-card.module';
import { TutorCalendarModule } from './modules/tutor-calendar/tutor-calendar.module';
import { TutorClassSessionModule } from './modules/tutor-class-session/tutor-class-session.module';
import { StudentModule } from './modules/student/student.module';

@Module({
  imports: [
    DatabaseModule,
    AnalyticsModule, // Analytics module (global) - should be imported early
    AuthModule, // AuthModule must be imported before GraphqlModule
    GraphqlModule,
    TutorModule,
    AddressModule,
    DocumentModule,
    ExperienceModule,
    OfferingsModule,
    ProficiencyModule,
    BatchJobsModule,
    AdminModule,
    UserBankDetailsModule,
    TutorRateCardModule,
    TutorCalendarModule,
    TutorClassSessionModule,
    StudentModule,
    // Add other modules here as they are created:
    // ClassesModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
