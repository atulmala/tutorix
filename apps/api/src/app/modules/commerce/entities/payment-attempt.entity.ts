import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { PaymentGatewayProviderEnum } from '../../payment/enums/payment.enums';
import { PaymentAttemptStatusEnum } from '../enums/commerce.enums';
import { OrderEntity } from './order.entity';

@ObjectType()
@Entity('commerce_payment_attempt')
export class PaymentAttemptEntity extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'order_id', type: 'integer' })
  @Index()
  orderId: number;

  @ManyToOne(() => OrderEntity, (order) => order.paymentAttempts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order?: OrderEntity;

  @Field(() => PaymentGatewayProviderEnum)
  @Column({
    name: 'provider',
    type: 'enum',
    enum: PaymentGatewayProviderEnum,
  })
  provider: PaymentGatewayProviderEnum;

  @Field()
  @Column({ name: 'gateway_order_id', type: 'varchar' })
  @Index()
  gatewayOrderId: string;

  @Field({ nullable: true })
  @Column({ name: 'gateway_payment_id', type: 'varchar', nullable: true })
  gatewayPaymentId?: string;

  @Field(() => Int)
  @Column({ name: 'amount_inr', type: 'integer' })
  amountInr: number;

  @Field(() => PaymentAttemptStatusEnum)
  @Column({
    type: 'enum',
    enum: PaymentAttemptStatusEnum,
    default: PaymentAttemptStatusEnum.pending,
  })
  status: PaymentAttemptStatusEnum;

  @Field({ nullable: true })
  @Column({ name: 'gateway_settlement_id', type: 'varchar', nullable: true })
  gatewaySettlementId?: string;

  @Field({ nullable: true })
  @Column({ name: 'settlement_utr', type: 'varchar', nullable: true })
  settlementUtr?: string;

  @Field({ nullable: true })
  @Column({ name: 'settled_at', type: 'timestamp', nullable: true })
  settledAt?: Date;
}
