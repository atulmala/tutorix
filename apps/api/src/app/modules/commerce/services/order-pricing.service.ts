import { Injectable } from '@nestjs/common';
import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { PlatformFeeConfigEntity } from '../../platform-fee/entities/platform-fee-config.entity';
import { PlatformFeeService } from '../../platform-fee/services/platform-fee.service';
import {
  OrderItemReferenceTypeEnum,
  OrderItemTypeEnum,
} from '../enums/commerce.enums';

export type PlatformFeeLineInput = {
  itemType: OrderItemTypeEnum;
  description: string;
  referenceType: OrderItemReferenceTypeEnum;
  referenceId: number;
  unitRateInr: number;
  quantity: number;
  lineSubtotalInr: number;
  discountInr: number;
  waiverApplied: boolean;
  amountDueInr: number;
};

const FEE_CODE_TO_ITEM_TYPE: Record<PlatformFeeCodeEnum, OrderItemTypeEnum> = {
  [PlatformFeeCodeEnum.TUTOR_REGISTRATION]: OrderItemTypeEnum.TUTOR_REGISTRATION,
  [PlatformFeeCodeEnum.STUDENT_REGISTRATION]:
    OrderItemTypeEnum.STUDENT_REGISTRATION,
  [PlatformFeeCodeEnum.PROFICIENCY_TEST]: OrderItemTypeEnum.PROFICIENCY_TEST,
};

@Injectable()
export class OrderPricingService {
  constructor(private readonly platformFeeService: PlatformFeeService) {}

  buildPlatformFeeLine(
    config: PlatformFeeConfigEntity,
    referenceType: OrderItemReferenceTypeEnum,
    referenceId: number,
    overrideAmountDueInr?: number,
  ): PlatformFeeLineInput {
    const unitRateInr = config.amountInr;
    const quantity = 1;
    const lineSubtotalInr = unitRateInr * quantity;
    const discountInr = Math.min(
      lineSubtotalInr,
      config.waived
        ? lineSubtotalInr
        : this.platformFeeService.getDiscountAmountInr(config),
    );
    const waiverApplied = config.waived;
    const amountDueInr =
      overrideAmountDueInr ??
      this.platformFeeService.getEffectiveAmountInr(config);

    return {
      itemType: FEE_CODE_TO_ITEM_TYPE[config.code],
      description: config.displayName,
      referenceType,
      referenceId,
      unitRateInr,
      quantity,
      lineSubtotalInr,
      discountInr,
      waiverApplied,
      amountDueInr,
    };
  }
}
