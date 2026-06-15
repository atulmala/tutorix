import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformFeeConfigEntity } from '../entities/platform-fee-config.entity';
import { PlatformFeeCodeEnum } from '../enums/platform-fee-code.enum';
import { PlatformFeeDiscountTypeEnum } from '../enums/platform-fee-discount-type.enum';
import { PlatformFeePublicInfo } from '../dto/platform-fee-public-info.dto';
import { AdminUpdatePlatformFeeInput } from '../dto/admin-update-platform-fee.input';

@Injectable()
export class PlatformFeeService {
  constructor(
    @InjectRepository(PlatformFeeConfigEntity)
    private readonly feeRepo: Repository<PlatformFeeConfigEntity>,
  ) {}

  async findAll(): Promise<PlatformFeeConfigEntity[]> {
    return this.feeRepo.find({
      where: { deleted: false },
      order: { id: 'ASC' },
    });
  }

  async findByCode(code: PlatformFeeCodeEnum): Promise<PlatformFeeConfigEntity> {
    const config = await this.feeRepo.findOne({
      where: { code, deleted: false },
    });
    if (!config) {
      throw new NotFoundException(`Platform fee config not found: ${code}`);
    }
    return config;
  }

  getDiscountAmountInr(config: PlatformFeeConfigEntity): number {
    if (config.discountType === PlatformFeeDiscountTypeEnum.FIXED_INR) {
      return Math.min(config.discountValue, config.amountInr);
    }
    if (config.discountType === PlatformFeeDiscountTypeEnum.PERCENT) {
      return Math.round((config.amountInr * config.discountValue) / 100);
    }
    return 0;
  }

  getEffectiveAmountInr(config: PlatformFeeConfigEntity): number {
    if (config.waived) {
      return 0;
    }
    const discountAmount = this.getDiscountAmountInr(config);
    return Math.max(0, config.amountInr - discountAmount);
  }

  buildDisplayLabel(config: PlatformFeeConfigEntity): string {
    const effective = this.getEffectiveAmountInr(config);
    if (effective <= 0) {
      return `₹${config.amountInr} — Free for now`;
    }
    if (this.getDiscountAmountInr(config) > 0) {
      return `₹${effective} (was ₹${config.amountInr})`;
    }
    return `₹${effective}`;
  }

  buildPublicFeeInfo(config: PlatformFeeConfigEntity): PlatformFeePublicInfo {
    const discountAmountInr = this.getDiscountAmountInr(config);
    const effectiveAmountInr = this.getEffectiveAmountInr(config);
    return {
      code: config.code,
      displayName: config.displayName,
      amountInr: config.amountInr,
      discountType: config.discountType,
      discountValue: config.discountValue,
      discountAmountInr,
      effectiveAmountInr,
      waived: config.waived,
      promoMessage: config.promoMessage,
      displayLabel: this.buildDisplayLabel(config),
    };
  }

  validateDiscount(config: Pick<
    PlatformFeeConfigEntity,
    'amountInr' | 'discountType' | 'discountValue'
  >): void {
    if (config.discountType === PlatformFeeDiscountTypeEnum.NONE) {
      if (config.discountValue !== 0) {
        throw new BadRequestException(
          'Discount value must be 0 when discount type is NONE',
        );
      }
      return;
    }
    if (config.discountType === PlatformFeeDiscountTypeEnum.PERCENT) {
      if (config.discountValue < 0 || config.discountValue > 100) {
        throw new BadRequestException(
          'Percent discount must be between 0 and 100',
        );
      }
      return;
    }
    if (config.discountType === PlatformFeeDiscountTypeEnum.FIXED_INR) {
      if (config.discountValue < 0 || config.discountValue > config.amountInr) {
        throw new BadRequestException(
          'Fixed discount must be between 0 and the list price',
        );
      }
    }
  }

  async updateConfig(
    input: AdminUpdatePlatformFeeInput,
  ): Promise<PlatformFeeConfigEntity> {
    const config = await this.findByCode(input.code);
    this.validateDiscount(input);
    config.amountInr = input.amountInr;
    config.discountType = input.discountType;
    config.discountValue = input.discountValue;
    config.waived = input.waived;
    config.promoMessage = input.promoMessage?.trim() || undefined;
    return this.feeRepo.save(config);
  }
}
