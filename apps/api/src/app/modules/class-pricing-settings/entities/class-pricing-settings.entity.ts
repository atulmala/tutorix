import { Column, Entity } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';

export const DEFAULT_COMMISSION_SLAB_THRESHOLD_INR = 600;

@ObjectType()
@Entity('class_pricing_settings')
export class ClassPricingSettingsEntity extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'minimum_online_price_per_class_inr', type: 'smallint', default: 0 })
  minimumOnlinePricePerClassInr!: number;

  @Field(() => Int)
  @Column({ name: 'minimum_offline_price_per_class_inr', type: 'smallint', default: 0 })
  minimumOfflinePricePerClassInr!: number;

  @Field(() => Int)
  @Column({ name: 'commission_slab_threshold_inr', type: 'smallint', default: 600 })
  commissionSlabThresholdInr!: number;

  @Field(() => Int)
  @Column({ name: 'tutor_commission_percent_up_to_slab', type: 'smallint', default: 0 })
  tutorCommissionPercentUpToSlab!: number;

  @Field(() => Int)
  @Column({ name: 'tutor_commission_percent_above_slab', type: 'smallint', default: 0 })
  tutorCommissionPercentAboveSlab!: number;

  @Field(() => Int)
  @Column({ name: 'platform_fee_per_participant_inr', type: 'smallint', default: 0 })
  platformFeePerParticipantInr!: number;
}
