import { BadRequestException } from '@nestjs/common';
import {
  ClassPricingSettingsEntity,
  DEFAULT_COMMISSION_SLAB_THRESHOLD_INR,
} from '../entities/class-pricing-settings.entity';
import { ClassPricingSettingsService } from './class-pricing-settings.service';

describe('ClassPricingSettingsService', () => {
  const settings: ClassPricingSettingsEntity = {
    id: 1,
    version: 1,
    deleted: false,
    active: true,
    createdDate: new Date(),
    updatedDate: new Date(),
    m_id: null as unknown as string,
    minimumOnlinePricePerClassInr: 0,
    minimumOfflinePricePerClassInr: 0,
    commissionSlabThresholdInr: DEFAULT_COMMISSION_SLAB_THRESHOLD_INR,
    tutorCommissionPercentUpToSlab: 0,
    tutorCommissionPercentAboveSlab: 0,
    platformFeePerParticipantInr: 0,
  } as ClassPricingSettingsEntity;

  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let service: ClassPricingSettingsService;

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue({ ...settings }),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    service = new ClassPricingSettingsService(repository as never);
  });

  it('returns settings from singleton row', async () => {
    const result = await service.getSettings();
    expect(result.commissionSlabThresholdInr).toBe(600);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('updates settings', async () => {
    const updated = await service.updateSettings({
      minimumOnlinePricePerClassInr: 300,
      minimumOfflinePricePerClassInr: 400,
      commissionSlabThresholdInr: 600,
      tutorCommissionPercentUpToSlab: 10,
      tutorCommissionPercentAboveSlab: 15,
      platformFeePerParticipantInr: 5,
    });
    expect(updated.minimumOnlinePricePerClassInr).toBe(300);
    expect(repository.save).toHaveBeenCalled();
  });

  it('rejects invalid commission percent', async () => {
    await expect(
      service.updateSettings({
        minimumOnlinePricePerClassInr: 0,
        minimumOfflinePricePerClassInr: 0,
        commissionSlabThresholdInr: 600,
        tutorCommissionPercentUpToSlab: 101,
        tutorCommissionPercentAboveSlab: 0,
        platformFeePerParticipantInr: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
