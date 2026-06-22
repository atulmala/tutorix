import { Column, Entity, Index, OneToMany, Unique } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import {
  OrderPaymentMethodEnum,
  OrderPayerRoleEnum,
  OrderSourceEnum,
  OrderStatusEnum,
} from '../enums/commerce.enums';
import { OrderItemEntity } from './order-item.entity';
import { PaymentAttemptEntity } from './payment-attempt.entity';

@ObjectType()
@Entity('commerce_order')
@Unique('UQ_commerce_order_order_number', ['orderNumber'])
export class OrderEntity extends QBaseEntity {
  @Field()
  @Column({ name: 'order_number', type: 'varchar', length: 32 })
  orderNumber: string;

  @Field(() => Int)
  @Column({ name: 'user_id', type: 'integer' })
  @Index()
  userId: number;

  @Field(() => OrderPayerRoleEnum)
  @Column({
    name: 'payer_role',
    type: 'enum',
    enum: OrderPayerRoleEnum,
  })
  payerRole: OrderPayerRoleEnum;

  @Field(() => OrderStatusEnum)
  @Column({
    type: 'enum',
    enum: OrderStatusEnum,
    default: OrderStatusEnum.draft,
  })
  @Index()
  status: OrderStatusEnum;

  @Field(() => Int)
  @Column({ name: 'subtotal_inr', type: 'integer', default: 0 })
  subtotalInr: number;

  @Field(() => Int)
  @Column({ name: 'discount_inr', type: 'integer', default: 0 })
  discountInr: number;

  @Field(() => Int)
  @Column({ name: 'tax_inr', type: 'integer', default: 0 })
  taxInr: number;

  @Field(() => Int)
  @Column({ name: 'points_redeemed', type: 'integer', default: 0 })
  pointsRedeemed: number;

  @Field(() => Int)
  @Column({ name: 'points_value_inr', type: 'integer', default: 0 })
  pointsValueInr: number;

  @Field(() => Int)
  @Column({ name: 'amount_due_inr', type: 'integer', default: 0 })
  amountDueInr: number;

  @Field(() => Int)
  @Column({ name: 'amount_paid_inr', type: 'integer', default: 0 })
  amountPaidInr: number;

  @Field({ nullable: true })
  @Column({ name: 'billing_name', type: 'varchar', nullable: true })
  billingName?: string;

  @Field({ nullable: true })
  @Column({ name: 'billing_email', type: 'varchar', nullable: true })
  billingEmail?: string;

  @Field({ nullable: true })
  @Column({ name: 'billing_phone', type: 'varchar', nullable: true })
  billingPhone?: string;

  @Field({ nullable: true })
  @Column({ name: 'billing_state_code', type: 'varchar', length: 8, nullable: true })
  billingStateCode?: string;

  @Field(() => OrderPaymentMethodEnum, { nullable: true })
  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: OrderPaymentMethodEnum,
    nullable: true,
  })
  paymentMethod?: OrderPaymentMethodEnum;

  @Field(() => OrderSourceEnum)
  @Column({
    type: 'enum',
    enum: OrderSourceEnum,
    default: OrderSourceEnum.onboarding,
  })
  source: OrderSourceEnum;

  @Field({ nullable: true })
  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date;

  @OneToMany(() => OrderItemEntity, (item) => item.order)
  items?: OrderItemEntity[];

  @OneToMany(() => PaymentAttemptEntity, (attempt) => attempt.order)
  paymentAttempts?: PaymentAttemptEntity[];
}
