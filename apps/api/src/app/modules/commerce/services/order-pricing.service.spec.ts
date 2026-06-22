import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { PlatformFeeDiscountTypeEnum } from '../../platform-fee/enums/platform-fee-discount-type.enum';
import { PlatformFeeConfigEntity } from '../../platform-fee/entities/platform-fee-config.entity';
import { PlatformFeeService } from '../../platform-fee/services/platform-fee.service';
import { OrderItemReferenceTypeEnum, OrderItemTypeEnum } from '../enums/commerce.enums';
import { OrderPricingService } from './order-pricing.service';

describe('OrderPricingService', () => {
  const platformFeeService = {
    getDiscountAmountInr: jest.fn(() => 0),
    getEffectiveAmountInr: jest.fn(() => 0),
  } as unknown as PlatformFeeService;
  const service = new OrderPricingService(platformFeeService);

  it('builds waived line with list price and full discount', () => {
    const config = {
      code: PlatformFeeCodeEnum.TUTOR_REGISTRATION,
      displayName: 'Tutor registration fee',
      amountInr: 999,
      discountType: PlatformFeeDiscountTypeEnum.NONE,
      discountValue: 0,
      waived: true,
    } as PlatformFeeConfigEntity;

    const line = service.buildPlatformFeeLine(
      config,
      OrderItemReferenceTypeEnum.tutor,
      42,
    );

    expect(line.itemType).toBe(OrderItemTypeEnum.TUTOR_REGISTRATION);
    expect(line.unitRateInr).toBe(999);
    expect(line.lineSubtotalInr).toBe(999);
    expect(line.discountInr).toBe(999);
    expect(line.waiverApplied).toBe(true);
    expect(line.amountDueInr).toBe(0);
  });

  it('respects override amount due for PT fee records', () => {
    const config = {
      code: PlatformFeeCodeEnum.PROFICIENCY_TEST,
      displayName: 'Proficiency test fee',
      amountInr: 99,
      discountType: PlatformFeeDiscountTypeEnum.NONE,
      discountValue: 0,
      waived: true,
    } as PlatformFeeConfigEntity;

    const line = service.buildPlatformFeeLine(
      config,
      OrderItemReferenceTypeEnum.tutor_offering,
      7,
      0,
    );

    expect(line.unitRateInr).toBe(99);
    expect(line.amountDueInr).toBe(0);
    expect(line.discountInr).toBe(99);
  });
});
