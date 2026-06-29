import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformFeeDiscountTypeEnum } from '../../platform-fee/enums/platform-fee-discount-type.enum';
import { PlatformFeeService } from '../../platform-fee/services/platform-fee.service';
import { TutorOfferingEntity } from '../entities/tutor-offering.entity';
import { TutorOfferingPtFeeEntity } from '../entities/tutor-offering-pt-fee.entity';
import { TutorOfferingPtFeeStatusEnum } from '../enums/tutor-offering-pt-fee-status.enum';
import { TutorOfferingPtFeeService } from './tutor-offering-pt-fee.service';

describe('TutorOfferingPtFeeService', () => {
  let service: TutorOfferingPtFeeService;
  let feeSave: jest.Mock;
  let feeCreate: jest.Mock;
  let feeFindOne: jest.Mock;
  let tutorOfferingFindOne: jest.Mock;
  let platformFeeService: {
    findByCode: jest.Mock;
    getEffectiveAmountInr: jest.Mock;
  };

  const platformConfig = {
    amountInr: 99,
    waived: false,
    discountType: PlatformFeeDiscountTypeEnum.NONE,
    discountValue: 0,
  };

  beforeEach(async () => {
    feeSave = jest.fn().mockImplementation((entity) => Promise.resolve(entity));
    feeCreate = jest.fn().mockImplementation((entity) => entity);
    feeFindOne = jest.fn();
    tutorOfferingFindOne = jest.fn().mockResolvedValue({
      id: 42,
      isInitialOnboarding: false,
      deleted: false,
    });
    platformFeeService = {
      findByCode: jest.fn().mockResolvedValue(platformConfig),
      getEffectiveAmountInr: jest.fn().mockReturnValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorOfferingPtFeeService,
        {
          provide: getRepositoryToken(TutorOfferingPtFeeEntity),
          useValue: { save: feeSave, create: feeCreate, findOne: feeFindOne },
        },
        {
          provide: getRepositoryToken(TutorOfferingEntity),
          useValue: { findOne: tutorOfferingFindOne },
        },
        {
          provide: PlatformFeeService,
          useValue: platformFeeService,
        },
      ],
    }).compile();

    service = module.get(TutorOfferingPtFeeService);
  });

  it('creates waived fee when collection is disabled for post-onboarding offering', async () => {
    await service.createForTutorOffering(42);

    expect(feeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tutorOfferingId: 42,
        listPriceInr: 99,
        amountDueInr: 0,
        paymentStatus: TutorOfferingPtFeeStatusEnum.waived,
      }),
    );
    expect(feeSave).toHaveBeenCalled();
  });

  it('creates waived fee for initial onboarding even when collection is enabled', async () => {
    tutorOfferingFindOne.mockResolvedValue({
      id: 42,
      isInitialOnboarding: true,
      deleted: false,
    });
    platformFeeService.getEffectiveAmountInr.mockReturnValue(99);

    await service.createForTutorOffering(42);

    expect(feeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tutorOfferingId: 42,
        amountDueInr: 0,
        paymentStatus: TutorOfferingPtFeeStatusEnum.waived,
      }),
    );
  });

  it('creates pending fee for post-onboarding when collection is enabled', async () => {
    platformFeeService.getEffectiveAmountInr.mockReturnValue(99);

    await service.createForTutorOffering(42);

    expect(feeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amountDueInr: 99,
        paymentStatus: TutorOfferingPtFeeStatusEnum.pending,
      }),
    );
  });

  it('builds free display label when amount due is zero', () => {
    expect(service.buildDisplayLabel(99, 0)).toBe('₹99 — Free for now');
  });

  it('blocks PT when collection enabled and fee is pending for post-onboarding', async () => {
    tutorOfferingFindOne.mockResolvedValue({
      id: 1,
      isInitialOnboarding: false,
      deleted: false,
    });
    feeFindOne.mockResolvedValue({
      amountDueInr: 99,
      paymentStatus: TutorOfferingPtFeeStatusEnum.pending,
    });

    await expect(service.assertCanTakeProficiencyTest(1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('allows PT during onboarding even when fee row is pending', async () => {
    tutorOfferingFindOne.mockResolvedValue({
      id: 1,
      isInitialOnboarding: true,
      deleted: false,
    });
    feeFindOne.mockResolvedValue({
      amountDueInr: 99,
      paymentStatus: TutorOfferingPtFeeStatusEnum.pending,
    });

    await expect(service.assertCanTakeProficiencyTest(1)).resolves.toBeUndefined();
  });

  it('creates missing fee record when resolving ptFeeInfo', async () => {
    tutorOfferingFindOne.mockResolvedValue({
      id: 42,
      isInitialOnboarding: true,
      deleted: false,
    });
    feeFindOne.mockResolvedValue(null);

    const info = await service.getFeeInfoForTutorOffering(42);

    expect(feeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tutorOfferingId: 42 }),
    );
    expect(info.listPriceInr).toBe(99);
    expect(info.amountDueInr).toBe(0);
    expect(info.paymentStatus).toBe(TutorOfferingPtFeeStatusEnum.waived);
  });

  it('returns waived ptFeeInfo for onboarding offering with stale pending row', async () => {
    tutorOfferingFindOne.mockResolvedValue({
      id: 7,
      isInitialOnboarding: true,
      deleted: false,
    });
    feeFindOne.mockResolvedValue({
      tutorOfferingId: 7,
      listPriceInr: 99,
      amountDueInr: 99,
      paymentStatus: TutorOfferingPtFeeStatusEnum.pending,
    });

    const info = await service.getFeeInfoForTutorOffering(7);

    expect(info.amountDueInr).toBe(0);
    expect(info.collectionEnabled).toBe(false);
    expect(info.paymentStatus).toBe(TutorOfferingPtFeeStatusEnum.waived);
  });

  it('throws when tutor offering is missing', async () => {
    tutorOfferingFindOne.mockResolvedValue(null);

    await expect(service.getFeeInfoForTutorOffering(999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
