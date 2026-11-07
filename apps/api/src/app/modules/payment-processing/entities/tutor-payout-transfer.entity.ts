import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { PaymentDisbursementEntity } from './payment-disbursement.entity';

@ObjectType()
@Entity('tutor_payout_transfer')
export class TutorPayoutTransferEntity extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'tutor_id', type: 'integer' })
  @Index()
  tutorId!: number;

  @ManyToOne(() => Tutor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_id' })
  tutor?: Tutor;

  @Field(() => String)
  @Column({ name: 'period_start_date', type: 'date' })
  periodStartDate!: string;

  @Field(() => String)
  @Column({ name: 'period_end_date', type: 'date' })
  periodEndDate!: string;

  @Field(() => Int)
  @Column({ name: 'amount_inr', type: 'integer' })
  amountInr!: number;

  @Field()
  @Column({ name: 'paid_at', type: 'timestamp' })
  paidAt!: Date;

  @Field(() => String, { nullable: true })
  @Column({ name: 'bank_account_last4', type: 'varchar', length: 4, nullable: true })
  bankAccountLast4?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'utr_reference', type: 'varchar', nullable: true })
  utrReference?: string | null;

  @Field(() => Int)
  @Column({ name: 'payment_disbursement_id', type: 'integer' })
  paymentDisbursementId!: number;

  @ManyToOne(() => PaymentDisbursementEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_disbursement_id' })
  paymentDisbursement?: PaymentDisbursementEntity;

  @Field(() => String, { nullable: true })
  @Column({ name: 'razorpay_payout_id', type: 'varchar', nullable: true })
  razorpayPayoutId?: string | null;
}
