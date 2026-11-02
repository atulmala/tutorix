import { Column, Entity } from 'typeorm';
import { Field, Float, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';

export const DEFAULT_PAYMENT_GATEWAY_GST_RATE_PERCENT = 18;

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
}
