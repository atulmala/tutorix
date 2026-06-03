import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorClassSessionEnrollmentEntity } from './entities/tutor-class-session-enrollment.entity';
import { TutorClassSessionEntity } from './entities/tutor-class-session.entity';

/** Scaffold for batch booking; resolvers and services to be added later. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TutorClassSessionEntity,
      TutorClassSessionEnrollmentEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class TutorClassSessionModule {}
