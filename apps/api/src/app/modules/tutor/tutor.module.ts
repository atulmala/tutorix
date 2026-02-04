import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tutor } from './entities/tutor.entity';
import { TutorQualificationEntity } from './entities/tutor-qualification.entity';
import { TutorResolver } from './resolvers/tutor.resolver';
import { TutorService } from './services/tutor.service';
import { TutorQualificationService } from './services/tutor-qualification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tutor, TutorQualificationEntity]),
  ],
  providers: [TutorResolver, TutorService, TutorQualificationService],
  exports: [TutorService, TutorQualificationService],
})
export class TutorModule {}

