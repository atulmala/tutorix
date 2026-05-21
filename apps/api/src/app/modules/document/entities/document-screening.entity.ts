import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BatchJobRunEntity } from '../../../batch-jobs/entities/batch-job-run.entity';
import { User } from '../../auth/entities/user.entity';
import { DocumentEntity } from './document.entity';
import { DocumentScreeningStatusEnum } from '../enums/document-screening-status.enum';

@ObjectType()
@Entity('document_screening')
export class DocumentScreeningEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => Int)
  @Column({ name: 'document_id' })
  documentId: number;

  @Field(() => DocumentEntity, { nullable: true })
  @OneToOne(() => DocumentEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document?: DocumentEntity;

  @Field(() => DocumentScreeningStatusEnum)
  @Column({
    type: 'enum',
    enum: DocumentScreeningStatusEnum,
    enumName: 'document_screening_status_enum',
  })
  status: DocumentScreeningStatusEnum;

  @Field({ nullable: true })
  @Column({ name: 'automated_at', type: 'timestamp', nullable: true })
  automatedAt?: Date;

  @Field({ nullable: true })
  @Column({ name: 'model_id', length: 128, nullable: true })
  modelId?: string;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  confidence?: number;

  @Field({ nullable: true })
  @Column({ name: 'summary_notes', type: 'text', nullable: true })
  summaryNotes?: string;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'reviewed_by_user_id', nullable: true })
  reviewedByUserId?: number;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedBy?: User;

  @Field({ nullable: true })
  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Field({ nullable: true })
  @Column({ name: 'reviewer_note', type: 'text', nullable: true })
  reviewerNote?: string;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'batch_job_run_id', nullable: true })
  batchJobRunId?: number;

  @Field(() => BatchJobRunEntity, { nullable: true })
  @ManyToOne(() => BatchJobRunEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'batch_job_run_id' })
  batchJobRun?: BatchJobRunEntity;
}
