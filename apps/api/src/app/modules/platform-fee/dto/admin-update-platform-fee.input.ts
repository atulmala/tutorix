import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PlatformFeeCodeEnum } from '../enums/platform-fee-code.enum';
import { PlatformFeeDiscountTypeEnum } from '../enums/platform-fee-discount-type.enum';

@InputType()
export class AdminUpdatePlatformFeeInput {
  @Field(() => PlatformFeeCodeEnum)
  @IsEnum(PlatformFeeCodeEnum)
  code: PlatformFeeCodeEnum;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(99999)
  amountInr: number;

  @Field(() => PlatformFeeDiscountTypeEnum)
  @IsEnum(PlatformFeeDiscountTypeEnum)
  discountType: PlatformFeeDiscountTypeEnum;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(10000)
  discountValue: number;

  @Field()
  @IsBoolean()
  waived: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  promoMessage?: string;
}
