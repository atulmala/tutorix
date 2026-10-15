import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUpdateClassPricingSettingsInput } from '../dto/admin-update-class-pricing-settings.input';
import {
  ClassPricingSettingsEntity,
  DEFAULT_COMMISSION_SLAB_THRESHOLD_INR,
} from '../entities/class-pricing-settings.entity';

const SINGLETON_ID = 1;

@Injectable()
export class ClassPricingSettingsService implements OnModuleInit {
  private readonly logger = new Logger(ClassPricingSettingsService.name);

  constructor(
    @InjectRepository(ClassPricingSettingsEntity)
    private readonly repository: Repository<ClassPricingSettingsEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureSingleton();
    } catch (error) {
      this.logger.warn(
        'Could not ensure class_pricing_settings row (migration may not have run yet)',
        error instanceof Error ? error.message : error,
      );
    }
  }

  async getSettings(): Promise<ClassPricingSettingsEntity> {
    return this.ensureSingleton();
  }

  validateInput(input: AdminUpdateClassPricingSettingsInput): void {
    if (input.commissionSlabThresholdInr < 1) {
      throw new BadRequestException('Commission slab threshold must be at least 1');
    }
    for (const field of [
      'tutorCommissionPercentUpToSlab',
      'tutorCommissionPercentAboveSlab',
    ] as const) {
      const value = input[field];
      if (value < 0 || value > 100) {
        throw new BadRequestException('Commission percent must be between 0 and 100');
      }
    }
    for (const field of [
      'minimumOnlinePricePerClassInr',
      'minimumOfflinePricePerClassInr',
      'platformFeePerParticipantInr',
    ] as const) {
      if (input[field] < 0) {
        throw new BadRequestException('Amount must be 0 or greater');
      }
    }
  }

  async updateSettings(
    input: AdminUpdateClassPricingSettingsInput,
  ): Promise<ClassPricingSettingsEntity> {
    this.validateInput(input);
    const settings = await this.ensureSingleton();
    settings.minimumOnlinePricePerClassInr = input.minimumOnlinePricePerClassInr;
    settings.minimumOfflinePricePerClassInr = input.minimumOfflinePricePerClassInr;
    settings.commissionSlabThresholdInr = input.commissionSlabThresholdInr;
    settings.tutorCommissionPercentUpToSlab = input.tutorCommissionPercentUpToSlab;
    settings.tutorCommissionPercentAboveSlab = input.tutorCommissionPercentAboveSlab;
    settings.platformFeePerParticipantInr = input.platformFeePerParticipantInr;
    return this.repository.save(settings);
  }

  private async ensureSingleton(): Promise<ClassPricingSettingsEntity> {
    let settings = await this.repository.findOne({
      where: { id: SINGLETON_ID },
    });
    if (settings) {
      return settings;
    }

    settings = this.repository.create({
      id: SINGLETON_ID,
      minimumOnlinePricePerClassInr: 0,
      minimumOfflinePricePerClassInr: 0,
      commissionSlabThresholdInr: DEFAULT_COMMISSION_SLAB_THRESHOLD_INR,
      tutorCommissionPercentUpToSlab: 0,
      tutorCommissionPercentAboveSlab: 0,
      platformFeePerParticipantInr: 0,
    });
    try {
      return await this.repository.save(settings);
    } catch {
      const existing = await this.repository.findOne({
        where: { id: SINGLETON_ID },
      });
      if (existing) {
        return existing;
      }
      throw new Error('Failed to create class_pricing_settings singleton row');
    }
  }
}
