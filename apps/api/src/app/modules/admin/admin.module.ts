import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Tutor } from '../tutor/entities/tutor.entity';
import { Student } from '../student/entities/student.entity';
import { AuthModule } from '../auth/auth.module';
import { DocumentModule } from '../document/document.module';
import { ExperienceModule } from '../experience/experience.module';
import { OfferingsModule } from '../offerings/offerings.module';
import { ProficiencyModule } from '../proficiency/proficiency.module';
import { TutorModule } from '../tutor/tutor.module';
import { StudentModule } from '../student/student.module';
import { TutorCalendarModule } from '../tutor-calendar/tutor-calendar.module';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tutor, Student]),
    AuthModule,
    TutorModule,
    StudentModule,
    TutorCalendarModule,
    ExperienceModule,
    DocumentModule,
    ProficiencyModule,
    OfferingsModule,
  ],
  providers: [AdminService, AdminResolver, RolesGuard],
  exports: [AdminService],
})
export class AdminModule {}
