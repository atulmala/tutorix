import { Column, Entity, Index } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { PlatformFeeCodeEnum } from '../enums/platform-fee-code.enum';
import { PlatformFeeDiscountTypeEnum } from '../enums/platform-fee-discount-type.enum';

@ObjectType()
@Entity('platform_fee_config')
export class PlatformFeeConfigEntity extends QBaseEntity {
  @Field(() => PlatformFeeCodeEnum)
  @Column({
    type: 'enum',
    enum: PlatformFeeCodeEnum,
    unique: true,
  })
  @Index({ unique: true })
  code: PlatformFeeCodeEnum;

  @Field()
  @Column({ name: 'display_name', type: 'varchar', length: 120 })
  displayName: string;

  @Field(() => Int)
  @Column({ name: 'amount_inr', type: 'smallint' })
  amountInr: number;

  @Field(() => PlatformFeeDiscountTypeEnum)
  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: PlatformFeeDiscountTypeEnum,
    default: PlatformFeeDiscountTypeEnum.NONE,
  })
  discountType: PlatformFeeDiscountTypeEnum;

  @Field(() => Int)
  @Column({ name: 'discount_value', type: 'smallint', default: 0 })
  discountValue: number;

  @Field()
  @Column({ default: false })
  waived: boolean;

  @Field({ nullable: true })
  @Column({ name: 'promo_message', type: 'text', nullable: true })
  promoMessage?: string;
}
