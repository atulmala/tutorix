import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TutorOfferingPtFeeEntity } from '../entities/tutor-offering-pt-fee.entity';
import { TutorOfferingPtFeeStatusEnum } from '../enums/tutor-offering-pt-fee-status.enum';
import { TutorOfferingPtFeeService } from './tutor-offering-pt-fee.service';

describe('TutorOfferingPtFeeService', () => {
  let service: TutorOfferingPtFeeService;
  let save: jest.Mock;
  let create: jest.Mock;
  let findOne: jest.Mock;
  const originalEnv = process.env.PT_FEE_COLLECTION_ENABLED;

  beforeEach(async () => {
    delete process.env.PT_FEE_COLLECTION_ENABLED;
    save = jest.fn().mockImplementation((entity) => Promise.resolve(entity));
    create = jest.fn().mockImplementation((entity) => entity);
    findOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorOfferingPtFeeService,
        {
          provide: getRepositoryToken(TutorOfferingPtFeeEntity),
          useValue: { save, create, findOne },
        },
      ],
    }).compile();

    service = module.get(TutorOfferingPtFeeService);
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PT_FEE_COLLECTION_ENABLED;
    } else {
      process.env.PT_FEE_COLLECTION_ENABLED = originalEnv;
    }
  });

  it('creates waived fee when collection is disabled', async () => {
    await service.createForTutorOffering(42);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        tutorOfferingId: 42,
        listPriceInr: 99,
        amountDueInr: 0,
        paymentStatus: TutorOfferingPtFeeStatusEnum.waived,
      }),
    );
    expect(save).toHaveBeenCalled();
  });

  it('builds free display label when amount due is zero', () => {
    expect(service.buildDisplayLabel(99, 0)).toBe('₹99 — Free for now');
  });

  it('blocks PT when collection enabled and fee is pending', async () => {
    process.env.PT_FEE_COLLECTION_ENABLED = 'true';
    findOne.mockResolvedValue({
      amountDueInr: 99,
      paymentStatus: TutorOfferingPtFeeStatusEnum.pending,
    });

    await expect(service.assertCanTakeProficiencyTest(1)).rejects.toThrow(
      BadRequestException,
    );
  });
});
