import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PlatformFeeCodeEnum } from '../enums/platform-fee-code.enum';
import { PlatformFeeDiscountTypeEnum } from '../enums/platform-fee-discount-type.enum';

@ObjectType()
export class PlatformFeePublicInfo {
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

  @Field()
  displayLabel: string;
}
