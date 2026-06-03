import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole } from '../../auth/enums/user-role.enum';
import { TutorOfferingEntity } from '../entities/tutor-offering.entity';
import { TutorOfferingStatusEnum } from '../enums/tutor.enums';
import { TutorAddOfferingService } from './tutor-add-offering.service';
import { TutorOfferingService } from './tutor-offering.service';
import { TutorOfferingPtFeeService } from './tutor-offering-pt-fee.service';
import { TutorService } from './tutor.service';
import { TutorOfferingPtFeeStatusEnum } from '../enums/tutor-offering-pt-fee-status.enum';

describe('TutorAddOfferingService', () => {
  let service: TutorAddOfferingService;
  let tutorOfferingFindOne: jest.Mock;
  let tutorServiceFindByUserId: jest.Mock;
  let findPendingForTutor: jest.Mock;
  let saveForTutor: jest.Mock;
  let createForTutorOffering: jest.Mock;
  let findByIdForTutor: jest.Mock;
  let mapToGraphql: jest.Mock;

  const onboardedTutor = {
    id: 10,
    onBoardingComplete: true,
    onboardingCelebrationSeen: true,
  };

  const tutorUser = { id: 1, role: UserRole.TUTOR };

  beforeEach(async () => {
    tutorOfferingFindOne = jest.fn();
    tutorServiceFindByUserId = jest.fn().mockResolvedValue(onboardedTutor);
    findPendingForTutor = jest.fn().mockResolvedValue([]);
    saveForTutor = jest.fn().mockResolvedValue([
      { id: 99, offeringId: 5, status: TutorOfferingStatusEnum.pending_pt },
    ]);
    createForTutorOffering = jest.fn().mockResolvedValue({
      tutorOfferingId: 99,
      listPriceInr: 99,
      amountDueInr: 0,
      paymentStatus: TutorOfferingPtFeeStatusEnum.waived,
    });
    findByIdForTutor = jest.fn().mockResolvedValue({
      id: 99,
      offeringId: 5,
      status: TutorOfferingStatusEnum.pending_pt,
    });
    mapToGraphql = jest.fn().mockReturnValue({
      listPriceInr: 99,
      amountDueInr: 0,
      displayLabel: '₹99 — Free for now',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorAddOfferingService,
        {
          provide: getRepositoryToken(TutorOfferingEntity),
          useValue: { findOne: tutorOfferingFindOne },
        },
        { provide: TutorService, useValue: { findByUserId: tutorServiceFindByUserId } },
        {
          provide: TutorOfferingService,
          useValue: {
            findPendingForTutor,
            saveForTutor,
            findByIdForTutor,
          },
        },
        {
          provide: TutorOfferingPtFeeService,
          useValue: { createForTutorOffering, mapToGraphql },
        },
      ],
    }).compile();

    service = module.get(TutorAddOfferingService);
  });

  it('rejects non-tutor users', async () => {
    await expect(
      service.addMyTutorOffering({ id: 1, role: UserRole.STUDENT } as never, 5),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects tutors who have not finished onboarding', async () => {
    tutorServiceFindByUserId.mockResolvedValue({
      ...onboardedTutor,
      onBoardingComplete: false,
    });

    await expect(
      service.addMyTutorOffering(tutorUser as never, 5),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects duplicate catalog offerings', async () => {
    tutorOfferingFindOne.mockResolvedValue({ id: 50, offeringId: 5 });

    await expect(
      service.addMyTutorOffering(tutorUser as never, 5),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when another offering is pending PT', async () => {
    findPendingForTutor.mockResolvedValue([{ id: 88 }]);

    await expect(
      service.addMyTutorOffering(tutorUser as never, 5),
    ).rejects.toThrow(/Complete the proficiency test/);
  });

  it('creates offering with post-onboarding flags and waived fee', async () => {
    tutorOfferingFindOne.mockResolvedValue(null);

    const result = await service.addMyTutorOffering(tutorUser as never, 5);

    expect(saveForTutor).toHaveBeenCalledWith(10, [5], {
      isInitialOnboarding: false,
      advanceToNextStep: false,
    });
    expect(createForTutorOffering).toHaveBeenCalledWith(99);
    expect(result.tutorOffering.id).toBe(99);
    expect(result.ptFee.displayLabel).toBe('₹99 — Free for now');
  });
});
