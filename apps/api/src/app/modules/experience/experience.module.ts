import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExperienceEntity } from './entities/experience.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExperienceEntity]),
  ],
  providers: [],
  exports: [],
})
export class ExperienceModule {}
