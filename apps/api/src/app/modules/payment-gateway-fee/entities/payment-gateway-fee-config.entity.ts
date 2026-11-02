import { Column, Entity, Unique } from 'typeorm';
import { Field, Float, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';

@ObjectType()
@Entity('payment_gateway_fee_config')
@Unique('UQ_payment_gateway_fee_config_provider', ['provider'])
export class PaymentGatewayFeeConfigEntity extends QBaseEntity {
  @Field({ description: 'Stable key used to match commerce payment attempts' })
  @Column({ name: 'provider', type: 'varchar', length: 32 })
  provider!: string;

  @Field()
  @Column({ name: 'display_name', type: 'varchar', length: 128 })
  displayName!: string;

  @Field(() => Float)
  @Column({
    name: 'charge_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  chargePercent!: number;
}
