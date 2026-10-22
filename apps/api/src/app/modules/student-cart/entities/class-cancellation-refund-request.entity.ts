import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { BatchJobRunEntity } from '../../../batch-jobs/entities/batch-job-run.entity';
import { Student } from '../../student/entities/student.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { ClassCancellationRefundAiStatusEnum } from '../enums/class-cancellation-refund-ai-status.enum';
import { ClassCancellationRefundInitiatedByEnum } from '../enums/class-cancellation-refund-initiated-by.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../enums/class-cancellation-refund-payout-status.enum';
import { ClassCreditRefundMethodEnum } from '../enums/class-credit-refund-method.enum';

@ObjectType()
@Entity('class_cancellation_refund_request')
export class ClassCancellationRefundRequestEntity extends QBaseEntity {
  @Field(() => ClassCancellationRefundInitiatedByEnum)
  @Column({
    name: 'initiated_by',
    type: 'enum',
    enum: ClassCancellationRefundInitiatedByEnum,
    enumName: 'class_cancellation_refund_initiated_by_enum',
  })
  initiatedBy!: ClassCancellationRefundInitiatedByEnum;

  @Field(() => Int)
  @Column({ name: 'student_id', type: 'integer' })
  @Index()
  studentId!: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'tutor_id', type: 'integer', nullable: true })
  @Index()
  tutorId?: number | null;

  @ManyToOne(() => Tutor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tutor_id' })
  tutor?: Tutor | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'tutor_offering_id', type: 'integer', nullable: true })
  tutorOfferingId?: number | null;

  @ManyToOne(() => TutorOfferingEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tutor_offering_id' })
  tutorOffering?: TutorOfferingEntity | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'order_item_id', type: 'integer', nullable: true })
  orderItemId?: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'order_id', type: 'integer', nullable: true })
  orderId?: number | null;

  @Field(() => Int)
  @Column({ name: 'class_count', type: 'integer' })
  classCount!: number;

  @Field(() => Int)
  @Column({ name: 'amount_inr', type: 'integer' })
  amountInr!: number;

  @Field(() => ClassCreditRefundMethodEnum)
  @Column({
    name: 'refund_method',
    type: 'enum',
    enum: ClassCreditRefundMethodEnum,
    enumName: 'class_credit_refund_method_enum',
  })
  refundMethod!: ClassCreditRefundMethodEnum;

  @Field(() => ClassCancellationRefundPayoutStatusEnum)
  @Column({
    name: 'payout_status',
    type: 'enum',
    enum: ClassCancellationRefundPayoutStatusEnum,
    enumName: 'class_cancellation_refund_payout_status_enum',
    default: ClassCancellationRefundPayoutStatusEnum.pending,
  })
  payoutStatus!: ClassCancellationRefundPayoutStatusEnum;

  @Column({ name: 'refund_breakdown_json', type: 'jsonb', nullable: true })
  refundBreakdownJson?: Record<string, unknown> | null;

  @Field(() => Date)
  @Column({ name: 'initiated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  initiatedAt!: Date;

  @Field(() => Int)
  @Column({ name: 'initiated_by_user_id', type: 'integer' })
  initiatedByUserId!: number;

  @Field(() => Date, { nullable: true })
  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt?: Date | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'processed_by_user_id', type: 'integer', nullable: true })
  processedByUserId?: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'wallet_transaction_id', type: 'integer', nullable: true })
  walletTransactionId?: number | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string | null;

  @Field(() => ClassCancellationRefundAiStatusEnum)
  @Column({
    name: 'ai_status',
    type: 'enum',
    enum: ClassCancellationRefundAiStatusEnum,
    enumName: 'class_cancellation_refund_ai_status_enum',
    default: ClassCancellationRefundAiStatusEnum.pending,
  })
  aiStatus!: ClassCancellationRefundAiStatusEnum;

  @Field(() => String, { nullable: true })
  @Column({ name: 'ai_rejection_reason', type: 'text', nullable: true })
  aiRejectionReason?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary?: string | null;

  @Field(() => Float, { nullable: true })
  @Column({ name: 'ai_confidence', type: 'float', nullable: true })
  aiConfidence?: number | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'model_id', type: 'varchar', length: 128, nullable: true })
  modelId?: string | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'batch_job_run_id', type: 'integer', nullable: true })
  batchJobRunId?: number | null;

  @ManyToOne(() => BatchJobRunEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'batch_job_run_id' })
  batchJobRun?: BatchJobRunEntity | null;

  @Field(() => Date, { nullable: true })
  @Column({ name: 'ai_analyzed_at', type: 'timestamp', nullable: true })
  aiAnalyzedAt?: Date | null;

  @Column({ name: 'ai_checks_json', type: 'jsonb', nullable: true })
  aiChecksJson?: Record<string, unknown> | null;
}
