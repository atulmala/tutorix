import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tutor } from './entities/tutor.entity';
import { TutorQualificationEntity } from './entities/tutor-qualification.entity';
import { TutorOfferingEntity } from './entities/tutor-offering.entity';
import { TutorResolver } from './resolvers/tutor.resolver';
import { TutorService } from './services/tutor.service';
import { TutorQualificationService } from './services/tutor-qualification.service';
import { TutorOfferingService } from './services/tutor-offering.service';
import { ProficiencyModule } from '../proficiency/proficiency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tutor, TutorQualificationEntity, TutorOfferingEntity]),
    ProficiencyModule,
  ],
  providers: [
    TutorResolver,
    TutorService,
    TutorQualificationService,
    TutorOfferingService,
  ],
  exports: [TutorService, TutorQualificationService, TutorOfferingService],
})
export class TutorModule {}

