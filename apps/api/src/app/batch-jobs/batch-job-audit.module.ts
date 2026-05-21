import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchJobRunEntity } from './entities/batch-job-run.entity';
import { BatchJobRunService } from './services/batch-job-run.service';

@Module({
  imports: [TypeOrmModule.forFeature([BatchJobRunEntity])],
  providers: [BatchJobRunService],
  exports: [BatchJobRunService, TypeOrmModule],
})
export class BatchJobAuditModule {}
