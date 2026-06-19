import { PlatformFeeDiscountTypeEnum } from '../enums/platform-fee-discount-type.enum';
import { PlatformFeeService } from './platform-fee.service';
import { PlatformFeeConfigEntity } from '../entities/platform-fee-config.entity';

describe('PlatformFeeService', () => {
  const service = new PlatformFeeService(null as never);

  function config(
    partial: Partial<PlatformFeeConfigEntity>,
  ): PlatformFeeConfigEntity {
    return {
      amountInr: 999,
      discountType: PlatformFeeDiscountTypeEnum.NONE,
      discountValue: 0,
      waived: false,
      ...partial,
    } as PlatformFeeConfigEntity;
  }

  it('returns zero when waived', () => {
    expect(
      service.getEffectiveAmountInr(
        config({ waived: true, amountInr: 999 }),
      ),
    ).toBe(0);
  });

  it('applies fixed INR discount', () => {
    expect(
      service.getEffectiveAmountInr(
        config({
          amountInr: 999,
          discountType: PlatformFeeDiscountTypeEnum.FIXED_INR,
          discountValue: 100,
        }),
      ),
    ).toBe(899);
  });

  it('applies percent discount', () => {
    expect(
      service.getEffectiveAmountInr(
        config({
          amountInr: 100,
          discountType: PlatformFeeDiscountTypeEnum.PERCENT,
          discountValue: 10,
        }),
      ),
    ).toBe(90);
  });

  it('never returns negative effective amount', () => {
    expect(
      service.getEffectiveAmountInr(
        config({
          amountInr: 50,
          discountType: PlatformFeeDiscountTypeEnum.FIXED_INR,
          discountValue: 100,
        }),
      ),
    ).toBe(0);
  });
});
