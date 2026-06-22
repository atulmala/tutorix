import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { PlatformFeeDiscountTypeEnum } from '../../platform-fee/enums/platform-fee-discount-type.enum';
import { OrderItemReferenceTypeEnum, OrderItemTypeEnum, OrderPaymentMethodEnum, OrderPayerRoleEnum, OrderStatusEnum } from '../enums/commerce.enums';
import { CheckoutService } from './checkout.service';

describe('CheckoutService helpers', () => {
  it('maps tutor registration fee code to item type and payer role', () => {
    expect(CheckoutService.mapFeeCodeToItemType(PlatformFeeCodeEnum.TUTOR_REGISTRATION)).toBe(
      OrderItemTypeEnum.TUTOR_REGISTRATION,
    );
    expect(CheckoutService.mapFeeCodeToPayerRole(PlatformFeeCodeEnum.TUTOR_REGISTRATION)).toBe(
      OrderPayerRoleEnum.tutor,
    );
    expect(
      CheckoutService.mapContextTypeToReferenceType(
        'tutor' as never,
      ),
    ).toBe(OrderItemReferenceTypeEnum.tutor);
  });

  it('maps student registration fee code to student payer role', () => {
    expect(CheckoutService.mapFeeCodeToPayerRole(PlatformFeeCodeEnum.STUDENT_REGISTRATION)).toBe(
      OrderPayerRoleEnum.student,
    );
  });
});

describe('waived checkout expectations', () => {
  it('documents zero-net order contract', () => {
    expect(OrderPaymentMethodEnum.waived).toBe('waived');
    expect(OrderStatusEnum.paid).toBe('paid');
    expect(PlatformFeeDiscountTypeEnum.NONE).toBe('NONE');
  });
});
