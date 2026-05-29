import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExperienceEntity } from './entities/experience.entity';
import { ExperienceService } from './services/experience.service';
import { ExperienceResolver } from './resolvers/experience.resolver';
import { TutorModule } from '../tutor/tutor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExperienceEntity]),
    forwardRef(() => TutorModule),
  ],
  providers: [ExperienceService, ExperienceResolver],
  exports: [ExperienceService],
})
export class ExperienceModule {}
