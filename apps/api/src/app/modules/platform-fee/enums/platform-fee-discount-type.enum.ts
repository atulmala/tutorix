import { registerEnumType } from '@nestjs/graphql';

export enum PlatformFeeDiscountTypeEnum {
  NONE = 'NONE',
  FIXED_INR = 'FIXED_INR',
  PERCENT = 'PERCENT',
}

registerEnumType(PlatformFeeDiscountTypeEnum, {
  name: 'PlatformFeeDiscountType',
});
