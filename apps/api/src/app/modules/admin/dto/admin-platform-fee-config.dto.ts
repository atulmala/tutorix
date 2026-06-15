import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { PlatformFeeDiscountTypeEnum } from '../../platform-fee/enums/platform-fee-discount-type.enum';

@ObjectType()
export class AdminPlatformFeeConfig {
  @Field(() => Int)
  id: number;

  @Field(() => PlatformFeeCodeEnum)
  code: PlatformFeeCodeEnum;

  @Field()
  displayName: string;

  @Field(() => Int)
  amountInr: number;

  @Field(() => PlatformFeeDiscountTypeEnum)
  discountType: PlatformFeeDiscountTypeEnum;

  @Field(() => Int)
  discountValue: number;

  @Field(() => Int)
  discountAmountInr: number;

  @Field(() => Int)
  effectiveAmountInr: number;

  @Field()
  waived: boolean;

  @Field({ nullable: true })
  promoMessage?: string;
}
