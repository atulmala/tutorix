import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tutor } from './entities/tutor.entity';
import { TutorResolver } from './resolvers/tutor.resolver';
import { TutorService } from './services/tutor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tutor])],
  providers: [TutorResolver, TutorService],
  exports: [TutorService], // Export service if used by other modules
})
export class TutorModule {}

