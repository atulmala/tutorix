import { Column, Entity, Index } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { PlatformFeeDiscountTypeEnum } from '../../platform-fee/enums/platform-fee-discount-type.enum';
import {
  PaymentGatewayProviderEnum,
  PlatformFeePaymentContextTypeEnum,
  PlatformFeePaymentStatusEnum,
} from '../enums/payment.enums';

@ObjectType()
@Entity('platform_fee_payment')
export class PlatformFeePaymentEntity extends QBaseEntity {
  @Field(() => PlatformFeeCodeEnum)
  @Column({
    name: 'fee_code',
    type: 'enum',
    enum: PlatformFeeCodeEnum,
  })
  @Index()
  feeCode: PlatformFeeCodeEnum;

  @Field(() => Int)
  @Column({ name: 'user_id', type: 'integer' })
  @Index()
  userId: number;

  @Field(() => PlatformFeePaymentContextTypeEnum)
  @Column({
    name: 'context_type',
    type: 'enum',
    enum: PlatformFeePaymentContextTypeEnum,
  })
  contextType: PlatformFeePaymentContextTypeEnum;

  @Field(() => Int)
  @Column({ name: 'context_id', type: 'integer' })
  @Index()
  contextId: number;

  @Field(() => Int)
  @Column({ name: 'list_price_inr', type: 'smallint' })
  listPriceInr: number;

  @Field(() => PlatformFeeDiscountTypeEnum)
  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: PlatformFeeDiscountTypeEnum,
  })
  discountType: PlatformFeeDiscountTypeEnum;

  @Field(() => Int)
  @Column({ name: 'discount_value', type: 'smallint', default: 0 })
  discountValue: number;

  @Field(() => Int)
  @Column({ name: 'discount_amount_inr', type: 'smallint', default: 0 })
  discountAmountInr: number;

  @Field(() => Int)
  @Column({ name: 'amount_paid_inr', type: 'smallint', default: 0 })
  amountPaidInr: number;

  @Field(() => PaymentGatewayProviderEnum, { nullable: true })
  @Column({
    name: 'gateway_provider',
    type: 'enum',
    enum: PaymentGatewayProviderEnum,
    nullable: true,
  })
  gatewayProvider?: PaymentGatewayProviderEnum;

  @Field({ nullable: true })
  @Column({ name: 'gateway_order_id', nullable: true })
  gatewayOrderId?: string;

  @Field({ nullable: true })
  @Column({ name: 'gateway_payment_id', nullable: true })
  gatewayPaymentId?: string;

  @Field(() => PlatformFeePaymentStatusEnum)
  @Column({
    type: 'enum',
    enum: PlatformFeePaymentStatusEnum,
    default: PlatformFeePaymentStatusEnum.pending,
  })
  status: PlatformFeePaymentStatusEnum;

  @Field({ nullable: true })
  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date;
}
