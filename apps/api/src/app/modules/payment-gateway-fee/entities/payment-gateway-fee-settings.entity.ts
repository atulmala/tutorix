import { Column, Entity } from 'typeorm';
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';

export const DEFAULT_PAYMENT_GATEWAY_GST_RATE_PERCENT = 18;
export const DEFAULT_ACTIVE_PAYMENT_GATEWAY = 'razorpay';
export const DEFAULT_TUTOR_PAYOUT_PROVIDER = 'razorpayx';
export const DEFAULT_TUTOR_PAYOUT_SETTLEMENT_DAY_OF_MONTH = 3;

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

  @Field(() => Int)
  @Column({
    name: 'tutor_payout_settlement_day_of_month',
    type: 'smallint',
    default: DEFAULT_TUTOR_PAYOUT_SETTLEMENT_DAY_OF_MONTH,
  })
  tutorPayoutSettlementDayOfMonth!: number;
}
