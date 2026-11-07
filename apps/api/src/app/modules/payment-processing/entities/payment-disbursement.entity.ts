import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { ClassCancellationRefundRequestEntity } from '../../student-cart/entities/class-cancellation-refund-request.entity';
import { PaymentDisbursementKindEnum } from '../enums/payment-disbursement-kind.enum';
import { PaymentDisbursementSourceTypeEnum } from '../enums/payment-disbursement-source-type.enum';
import { PaymentDisbursementStatusEnum } from '../enums/payment-disbursement-status.enum';

@ObjectType()
@Entity('payment_disbursement')
export class PaymentDisbursementEntity extends QBaseEntity {
  @Field(() => PaymentDisbursementKindEnum)
  @Column({
    type: 'enum',
    enum: PaymentDisbursementKindEnum,
    enumName: 'payment_disbursement_kind_enum',
  })
  kind!: PaymentDisbursementKindEnum;

  @Field(() => PaymentDisbursementStatusEnum)
  @Column({
    type: 'enum',
    enum: PaymentDisbursementStatusEnum,
    enumName: 'payment_disbursement_status_enum',
    default: PaymentDisbursementStatusEnum.ready,
  })
  @Index()
  status!: PaymentDisbursementStatusEnum;

  @Field(() => Int)
  @Column({ name: 'payee_user_id', type: 'integer' })
  @Index()
  payeeUserId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payee_user_id' })
  payeeUser?: User;

  @Field(() => Int)
  @Column({ name: 'amount_inr', type: 'integer' })
  amountInr!: number;

  @Field(() => PaymentDisbursementSourceTypeEnum)
  @Column({
    name: 'source_type',
    type: 'enum',
    enum: PaymentDisbursementSourceTypeEnum,
    enumName: 'payment_disbursement_source_type_enum',
  })
  sourceType!: PaymentDisbursementSourceTypeEnum;

  @Field(() => Int)
  @Column({ name: 'source_id', type: 'integer' })
  sourceId!: number;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'class_cancellation_refund_request_id', type: 'integer', nullable: true })
  @Index()
  classCancellationRefundRequestId?: number | null;

  @ManyToOne(() => ClassCancellationRefundRequestEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'class_cancellation_refund_request_id' })
  classCancellationRefundRequest?: ClassCancellationRefundRequestEntity | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'tutor_id', type: 'integer', nullable: true })
  @Index()
  tutorId?: number | null;

  @ManyToOne(() => Tutor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tutor_id' })
  tutor?: Tutor | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'period_start_date', type: 'date', nullable: true })
  periodStartDate?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'period_end_date', type: 'date', nullable: true })
  periodEndDate?: string | null;

  @Column({ name: 'calculation_snapshot_json', type: 'jsonb', nullable: true })
  calculationSnapshotJson?: Record<string, unknown> | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'processed_by_user_id', type: 'integer', nullable: true })
  processedByUserId?: number | null;

  @Field(() => Date, { nullable: true })
  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt?: Date | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'wallet_transaction_id', type: 'integer', nullable: true })
  walletTransactionId?: number | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'gateway_payout_id', type: 'varchar', nullable: true })
  gatewayPayoutId?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'gateway_utr', type: 'varchar', nullable: true })
  gatewayUtr?: string | null;
}
