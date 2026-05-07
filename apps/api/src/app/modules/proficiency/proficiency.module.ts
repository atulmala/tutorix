import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProficiencyTestEntity } from './entities/proficiency-test.entity';
import { ProficiencyTestService } from './services/proficiency-test.service';
import { ProficiencyResolver } from './resolvers/proficiency.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([ProficiencyTestEntity])],
  providers: [ProficiencyTestService, ProficiencyResolver],
  exports: [ProficiencyTestService],
})
export class ProficiencyModule {}

