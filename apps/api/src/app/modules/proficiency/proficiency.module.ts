import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tutor } from '../tutor/entities/tutor.entity';
import { ProficiencyTestEntity } from './entities/proficiency-test.entity';
import { ProficiencyTestService } from './services/proficiency-test.service';
import { ProficiencyResolver } from './resolvers/proficiency.resolver';
import { PtAnswerResolver } from './resolvers/pt-answer.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([ProficiencyTestEntity, Tutor])],
  providers: [ProficiencyTestService, ProficiencyResolver, PtAnswerResolver],
  exports: [ProficiencyTestService],
})
export class ProficiencyModule {}

