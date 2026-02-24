import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProficiencyTestEntity } from './entities/proficiency-test.entity';
import { ProficiencyTestService } from './services/proficiency-test.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProficiencyTestEntity])],
  providers: [ProficiencyTestService],
  exports: [ProficiencyTestService],
})
export class ProficiencyModule {}

