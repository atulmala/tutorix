import { Column, Entity } from 'typeorm';
import { Field, Float, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';

export const DEFAULT_PAYMENT_GATEWAY_GST_RATE_PERCENT = 18;
export const DEFAULT_ACTIVE_PAYMENT_GATEWAY = 'razorpay';
export const DEFAULT_TUTOR_PAYOUT_PROVIDER = 'razorpayx';

@ObjectType()
@Entity('payment_gateway_fee_settings')
export class PaymentGatewayFeeSettingsEntity extends QBaseEntity {
  @Field(() => Float)
  @Column({
    name: 'gst_rate_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: DEFAULT_PAYMENT_GATEWAY_GST_RATE_PERCENT,
  })
  gstRatePercent!: number;

  @Column({
    name: 'active_payment_gateway',
    type: 'varchar',
    length: 32,
    default: DEFAULT_ACTIVE_PAYMENT_GATEWAY,
  })
  activePaymentGateway!: string;

  @Column({
    name: 'tutor_payout_provider',
    type: 'varchar',
    length: 32,
    default: DEFAULT_TUTOR_PAYOUT_PROVIDER,
  })
  tutorPayoutProvider!: string;
}
