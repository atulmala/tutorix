import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { PaymentAttemptEntity } from '../../commerce/entities/payment-attempt.entity';

@Entity('class_credit_gateway_refund')
export class ClassCreditGatewayRefundEntity extends QBaseEntity {
  @Column({ name: 'user_id', type: 'integer' })
  @Index()
  userId!: number;

  @Column({ name: 'payment_attempt_id', type: 'integer' })
  @Index()
  paymentAttemptId!: number;

  @ManyToOne(() => PaymentAttemptEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_attempt_id' })
  paymentAttempt?: PaymentAttemptEntity;

  @Column({ name: 'gateway_payment_id', type: 'varchar' })
  gatewayPaymentId!: string;

  @Column({ name: 'gateway_refund_id', type: 'varchar' })
  gatewayRefundId!: string;

  @Column({ name: 'amount_inr', type: 'integer' })
  amountInr!: number;
}
