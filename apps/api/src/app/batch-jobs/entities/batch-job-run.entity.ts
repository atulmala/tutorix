import { Field, HideField, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BatchJobNameEnum } from '../enums/batch-job-name.enum';
import { BatchJobRunStatusEnum } from '../enums/batch-job-run-status.enum';
import { BatchJobTriggerEnum } from '../enums/batch-job-trigger.enum';

@ObjectType()
@Entity('batch_job_run')
export class BatchJobRunEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => BatchJobNameEnum)
  @Column({
    name: 'job_name',
    type: 'enum',
    enum: BatchJobNameEnum,
    enumName: 'batch_job_name_enum',
  })
  jobName: BatchJobNameEnum;

  @Field(() => BatchJobRunStatusEnum)
  @Column({
    type: 'enum',
    enum: BatchJobRunStatusEnum,
    enumName: 'batch_job_run_status_enum',
    default: BatchJobRunStatusEnum.RUNNING,
  })
  status: BatchJobRunStatusEnum;

  @Field()
  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Field({ nullable: true })
  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt?: Date;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs?: number;

  @Field(() => Int)
  @Column({ name: 'items_found', type: 'integer', default: 0 })
  itemsFound: number;

  @Field(() => Int)
  @Column({ name: 'items_processed', type: 'integer', default: 0 })
  itemsProcessed: number;

  @Field(() => Int)
  @Column({ name: 'items_skipped', type: 'integer', default: 0 })
  itemsSkipped: number;

  @Field(() => Int)
  @Column({ name: 'items_failed', type: 'integer', default: 0 })
  itemsFailed: number;

  @Field({ nullable: true })
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Field(() => BatchJobTriggerEnum)
  @Column({
    name: 'triggered_by',
    type: 'enum',
    enum: BatchJobTriggerEnum,
    enumName: 'batch_job_trigger_enum',
    default: BatchJobTriggerEnum.CRON,
  })
  triggeredBy: BatchJobTriggerEnum;

  @HideField()
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;
}
