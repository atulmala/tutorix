import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BANK_DETAILS_REQUIRED_FOR_RATE_CARD_MESSAGE,
} from '@tutorix/shared-utils';
import { UserBankDetailsService } from '../../user-bank-details/services/user-bank-details.service';
import { TutorOfferingStatusEnum } from '../../tutor/enums/tutor.enums';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { TutorOfferingRateCardEntity } from '../entities/tutor-offering-rate-card.entity';
import { TutorRateCardService } from './tutor-rate-card.service';

const COMPLETE_BANK_DETAILS = {
  bankName: 'HDFC Bank',
  accountNumber: '123456789012',
  ifscCode: 'HDFC0001234',
  panNumber: 'ABCDE1234F',
};

const VALID_INPUT = {
  tutorOfferingId: 10,
  freeDemoOffered: false,
  offlineEnabled: true,
  offlineBaseRate: 500,
  offlineBaseDiscountPct: 0,
  offlineSlab2DiscountPct: null,
  offlineSlab3DiscountPct: null,
  offlineBatchSize: 1,
  onlineEnabled: false,
  onlineBaseRate: null,
  onlineBaseDiscountPct: null,
  onlineSlab2DiscountPct: null,
  onlineSlab3DiscountPct: null,
  onlineBatchSize: 1,
};

describe('TutorRateCardService', () => {
  let service: TutorRateCardService;
  let rateCardRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let tutorOfferingRepo: { findOne: jest.Mock };
  let tutorRepo: { findOne: jest.Mock };
  let userBankDetailsService: { findByUserId: jest.Mock };

  beforeEach(async () => {
    rateCardRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 99, ...value })),
      find: jest.fn(),
    };
    tutorOfferingRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 10,
        tutorId: 1,
        status: TutorOfferingStatusEnum.pt_passed,
        deleted: false,
      } as TutorOfferingEntity),
    };
    tutorRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, userId: 5, deleted: false } as Tutor),
    };
    userBankDetailsService = {
      findByUserId: jest.fn().mockResolvedValue(COMPLETE_BANK_DETAILS),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorRateCardService,
        { provide: getRepositoryToken(TutorOfferingRateCardEntity), useValue: rateCardRepo },
        { provide: getRepositoryToken(TutorOfferingEntity), useValue: tutorOfferingRepo },
        { provide: getRepositoryToken(Tutor), useValue: tutorRepo },
        { provide: UserBankDetailsService, useValue: userBankDetailsService },
      ],
    }).compile();

    service = module.get(TutorRateCardService);
  });

  describe('saveForTutorUser', () => {
    it('rejects when bank details are missing', async () => {
      userBankDetailsService.findByUserId.mockResolvedValue(null);

      await expect(service.saveForTutorUser(5, VALID_INPUT)).rejects.toThrow(
        new BadRequestException(BANK_DETAILS_REQUIRED_FOR_RATE_CARD_MESSAGE),
      );
      expect(rateCardRepo.save).not.toHaveBeenCalled();
    });

    it('rejects when bank details are incomplete', async () => {
      userBankDetailsService.findByUserId.mockResolvedValue({
        ...COMPLETE_BANK_DETAILS,
        panNumber: null,
      });

      await expect(service.saveForTutorUser(5, VALID_INPUT)).rejects.toThrow(
        BadRequestException,
      );
      expect(rateCardRepo.save).not.toHaveBeenCalled();
    });

    it('saves rate card when bank details are complete', async () => {
      const result = await service.saveForTutorUser(5, VALID_INPUT);

      expect(userBankDetailsService.findByUserId).toHaveBeenCalledWith(5);
      expect(rateCardRepo.create).toHaveBeenCalled();
      expect(rateCardRepo.save).toHaveBeenCalled();
      expect(result.offlineEnabled).toBe(true);
      expect(result.isComplete).toBe(true);
    });
  });
});
