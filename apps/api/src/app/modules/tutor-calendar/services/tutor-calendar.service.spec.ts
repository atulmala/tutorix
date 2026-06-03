import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TutorCalendarService } from './tutor-calendar.service';
import { TutorCalendar } from '../entities/tutor-calendar.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import { istSlotToUtc } from '@tutorix/shared-utils';

describe('TutorCalendarService', () => {
  let service: TutorCalendarService;
  let calendarRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let tutorRepo: { findOne: jest.Mock; save: jest.Mock };
  let tutorOfferingRepo: { find: jest.Mock };
  let tutorRateCardService: {
    findByTutorOfferingIds: jest.Mock;
    tutorHasCompleteRateCard?: jest.Mock;
  };

  const qbChain = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    calendarRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
      create: jest.fn().mockImplementation((x) => x),
      createQueryBuilder: jest.fn().mockReturnValue(qbChain),
    };
    tutorRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    tutorOfferingRepo = { find: jest.fn().mockResolvedValue([]) };
    tutorRateCardService = {
      findByTutorOfferingIds: jest.fn().mockResolvedValue(new Map()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorCalendarService,
        { provide: getRepositoryToken(TutorCalendar), useValue: calendarRepo },
        { provide: getRepositoryToken(Tutor), useValue: tutorRepo },
        {
          provide: getRepositoryToken(TutorOfferingEntity),
          useValue: tutorOfferingRepo,
        },
        { provide: TutorRateCardService, useValue: tutorRateCardService },
      ],
    }).compile();

    service = module.get(TutorCalendarService);
    jest.clearAllMocks();
    calendarRepo.createQueryBuilder.mockReturnValue(qbChain);
    qbChain.getMany.mockResolvedValue([]);
  });

  it('tutorHasCompleteRateCard returns false with no offerings', async () => {
    tutorOfferingRepo.find.mockResolvedValue([]);
    await expect(service.tutorHasCompleteRateCard(1)).resolves.toBe(false);
  });

  it('assertCanSetCalendar throws when no complete rate card', async () => {
    tutorOfferingRepo.find.mockResolvedValue([{ id: 10 }]);
    tutorRateCardService.findByTutorOfferingIds.mockResolvedValue(new Map());
    await expect(service.assertCanSetCalendar(1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('saveMyCalendar rejects misaligned slot minute', async () => {
    const now = istSlotToUtc(2026, 5, 10, 8, 0);
    jest.useFakeTimers();
    jest.setSystemTime(now);

    tutorRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 5,
      onBoardingComplete: true,
      onboardingCelebrationSeen: true,
      availabilityConfiguredAt: null,
    });
    tutorOfferingRepo.find.mockResolvedValue([{ id: 10 }]);
    tutorRateCardService.findByTutorOfferingIds.mockResolvedValue(
      new Map([
        [
          10,
          {
            offlineEnabled: true,
            offlineBaseRate: 500,
            onlineEnabled: false,
          },
        ],
      ]),
    );

    const rangeStart = istSlotToUtc(2026, 5, 10, 0, 0);
    const rangeEnd = istSlotToUtc(2026, 5, 11, 0, 0);
    const badSlot = istSlotToUtc(2026, 5, 10, 8, 15);

    await expect(
      service.saveMyCalendar(5, {
        rangeStart,
        rangeEnd,
        slotStarts: [badSlot],
      }),
    ).rejects.toThrow(BadRequestException);

    jest.useRealTimers();
  });
});
