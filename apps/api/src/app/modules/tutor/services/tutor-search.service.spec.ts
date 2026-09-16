jest.mock('../../document/document-image-media', () => ({
  buildTutorDocumentImageMediaPatch: jest.fn(),
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AddressType } from '../../address/enums/address-type.enum';
import { UserRole } from '../../auth/enums/user-role.enum';
import { ProfilePictureService } from '../../auth/services/profile-picture.service';
import { OfferingService } from '../../offerings/services/offering.service';
import { StudentService } from '../../student/services/student.service';
import { TutorCalendar } from '../../tutor-calendar/entities/tutor-calendar.entity';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import { TutorOfferingEntity } from '../entities/tutor-offering.entity';
import { TutorOfferingStatusEnum } from '../enums/tutor.enums';
import { YearsOfExperienceEnum } from '../enums/years-of-experience.enum';
import {
  TutorSearchDeliveryMode,
  TutorSearchSort,
} from '../enums/tutor-search.enum';
import { TutorSearchService } from './tutor-search.service';

describe('TutorSearchService', () => {
  let service: TutorSearchService;
  let findOfferings: jest.Mock;
  let findRateCards: jest.Mock;
  let findAllOfferings: jest.Mock;
  let findStudent: jest.Mock;
  let calendarGetRawMany: jest.Mock;
  let calendarAndWhere: jest.Mock;
  let resolveDisplayUrl: jest.Mock;

  const studentUser = { id: 9, role: UserRole.STUDENT };

  const completeCard = {
    freeDemoOffered: false,
    offlineEnabled: true,
    offlineBaseRate: 500,
    offlineBaseDiscountPct: 0,
    offlineBatchSize: 1,
    onlineEnabled: true,
    onlineBaseRate: 400,
    onlineBaseDiscountPct: 0,
    onlineBatchSize: 1,
  };

  function tutorRow(
    id: number,
    overrides?: {
      status?: TutorOfferingStatusEnum;
      onBoardingComplete?: boolean;
      latitude?: number;
      longitude?: number;
      deleted?: boolean;
    },
  ) {
    return {
      id,
      offeringId: 33,
      tutorId: id,
      status: overrides?.status ?? TutorOfferingStatusEnum.pt_passed,
      deleted: false,
      offering: {
        id: 33,
        displayName: 'Mathematics',
        level: 3,
        parentOffering: { id: 3 },
      },
      tutor: {
        id,
        deleted: overrides?.deleted ?? false,
        onBoardingComplete: overrides?.onBoardingComplete ?? true,
        yearsOfExperience: YearsOfExperienceEnum.ZERO_TO_TWO,
        user: { firstName: 'Tutor', lastName: String(id) },
        addresses: [
          {
            deleted: false,
            type: AddressType.TEACHING,
            primary: true,
            city: 'Bengaluru',
            latitude: overrides?.latitude ?? 12.97,
            longitude: overrides?.longitude ?? 77.59,
          },
        ],
      },
    };
  }

  beforeEach(async () => {
    findOfferings = jest.fn();
    findRateCards = jest.fn();
    findAllOfferings = jest.fn().mockResolvedValue([
      { id: 1, displayName: 'School Education', level: 0 },
      {
        id: 2,
        displayName: 'CBSE',
        level: 1,
        parentOffering: { id: 1 },
        rootOffering: { id: 1, displayName: 'School Education' },
      },
      {
        id: 3,
        displayName: 'Class 8',
        level: 2,
        parentOffering: { id: 2 },
        rootOffering: { id: 1, displayName: 'School Education' },
      },
      {
        id: 33,
        displayName: 'Mathematics',
        level: 3,
        parentOffering: { id: 3 },
        rootOffering: { id: 1, displayName: 'School Education' },
      },
    ]);
    findStudent = jest.fn().mockResolvedValue({
      id: 1,
      addresses: [
        {
          deleted: false,
          primary: true,
          latitude: 12.97,
          longitude: 77.59,
        },
      ],
    });
    calendarGetRawMany = jest.fn().mockResolvedValue([]);
    calendarAndWhere = jest.fn().mockReturnThis();
    resolveDisplayUrl = jest.fn().mockResolvedValue(null);

    const calendarQb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: calendarAndWhere,
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: calendarGetRawMany,
    };

    const module = await Test.createTestingModule({
      providers: [
        TutorSearchService,
        { provide: StudentService, useValue: { findByUserId: findStudent } },
        {
          provide: getRepositoryToken(TutorOfferingEntity),
          useValue: { find: findOfferings },
        },
        {
          provide: getRepositoryToken(TutorCalendar),
          useValue: { createQueryBuilder: () => calendarQb },
        },
        {
          provide: TutorRateCardService,
          useValue: { findByTutorOfferingIds: findRateCards },
        },
        { provide: OfferingService, useValue: { findAll: findAllOfferings } },
        {
          provide: ProfilePictureService,
          useValue: { resolveDisplayUrl },
        },
      ],
    }).compile();

    service = module.get(TutorSearchService);
  });

  it('rejects non-students', async () => {
    await expect(
      service.searchTutors({ id: 1, role: UserRole.TUTOR } as never, {
        offeringId: 33,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ranks a tutor with current-week slots first', async () => {
    findOfferings.mockResolvedValue([tutorRow(1), tutorRow(2)]);
    findRateCards.mockResolvedValue(
      new Map([
        [1, completeCard],
        [2, completeCard],
      ]),
    );
    calendarGetRawMany.mockResolvedValue([{ tutorId: 2, count: '3' }]);

    const result = await service.searchTutors(studentUser as never, {
      offeringId: 33,
      sortBy: TutorSearchSort.BEST_MATCH,
      deliveryMode: TutorSearchDeliveryMode.ANY,
    });

    expect(result.items.map((h) => h.tutorId)).toEqual([2, 1]);
    expect(result.items[0].hasAvailabilityThisWeek).toBe(true);
    expect(result.originHasCoordinates).toBe(true);
  });

  it('counts only current-week slots that start in the future', async () => {
    findOfferings.mockResolvedValue([tutorRow(1)]);
    findRateCards.mockResolvedValue(new Map([[1, completeCard]]));
    const before = Date.now();
    await service.searchTutors(studentUser as never, { offeringId: 33 });
    const fromCall = calendarAndWhere.mock.calls.find((call: unknown[]) =>
      String(call[0]).includes('startsAt >='),
    );
    expect(fromCall).toBeDefined();
    const from = (fromCall?.[1] as { from: Date }).from;
    expect(from.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('returns a nearby offline tutor in budget', async () => {
    findOfferings.mockResolvedValue([tutorRow(1)]);
    findRateCards.mockResolvedValue(new Map([[1, completeCard]]));
    const result = await service.searchTutors(studentUser as never, {
      offeringId: 33,
      deliveryMode: TutorSearchDeliveryMode.ANY,
      maxRateInr: 600,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].deliveryModeShown).toBe(TutorSearchDeliveryMode.OFFLINE);
    expect(result.items[0].distanceKm).toBeCloseTo(0, 1);
    expect(result.items[0].rateInr).toBe(500);
  });

  it('includes matching online tutors and ignores radius for online-only search', async () => {
    findOfferings.mockResolvedValue([tutorRow(1, { latitude: 13.1, longitude: 77.59 })]);
    findRateCards.mockResolvedValue(new Map([[1, completeCard]]));
    const result = await service.searchTutors(studentUser as never, {
      offeringId: 33,
      deliveryMode: TutorSearchDeliveryMode.ONLINE,
      radiusKm: 5,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].deliveryModeShown).toBe(TutorSearchDeliveryMode.ONLINE);
    expect(result.items[0].distanceKm).toBeNull();
    expect(result.items[0].rateInr).toBe(400);
  });

  it('ranks an in-budget tutor above an over-budget match', async () => {
    findOfferings.mockResolvedValue([tutorRow(1), tutorRow(2)]);
    findRateCards.mockResolvedValue(
      new Map([
        [1, { ...completeCard, onlineBaseRate: 900, offlineBaseRate: 900 }],
        [2, completeCard],
      ]),
    );
    const result = await service.searchTutors(studentUser as never, {
      offeringId: 33,
      deliveryMode: TutorSearchDeliveryMode.ONLINE,
      maxRateInr: 500,
    });
    expect(result.items.map((h) => h.tutorId)).toEqual([2, 1]);
  });

  it('excludes tutors without a complete rate card', async () => {
    findOfferings.mockResolvedValue([tutorRow(1)]);
    findRateCards.mockResolvedValue(new Map());
    const result = await service.searchTutors(studentUser as never, {
      offeringId: 33,
    });
    expect(result.items).toEqual([]);
  });

  it('excludes failed PT and tutors who are not onboarded', async () => {
    findOfferings.mockResolvedValue([
      tutorRow(1, { status: TutorOfferingStatusEnum.pt_failed }),
      tutorRow(2, { onBoardingComplete: false }),
      tutorRow(3),
    ]);
    findRateCards.mockResolvedValue(
      new Map([
        [1, completeCard],
        [2, completeCard],
        [3, completeCard],
      ]),
    );
    const result = await service.searchTutors(studentUser as never, {
      offeringId: 33,
    });
    expect(result.items.map((h) => h.tutorId)).toEqual([3]);
  });

  it('drops offline-only results outside the radius', async () => {
    findOfferings.mockResolvedValue([
      tutorRow(1, { latitude: 13.1, longitude: 77.59 }),
    ]);
    findRateCards.mockResolvedValue(
      new Map([[1, { ...completeCard, onlineEnabled: false }]]),
    );
    const result = await service.searchTutors(studentUser as never, {
      offeringId: 33,
      deliveryMode: TutorSearchDeliveryMode.OFFLINE,
      radiusKm: 10,
    });
    expect(result.items).toEqual([]);
  });

  it('forces online-only when the student has no mapped coordinates', async () => {
    findStudent.mockResolvedValue({ id: 1, addresses: [] });
    findOfferings.mockResolvedValue([tutorRow(1)]);
    findRateCards.mockResolvedValue(new Map([[1, completeCard]]));
    const result = await service.searchTutors(studentUser as never, {
      offeringId: 33,
      deliveryMode: TutorSearchDeliveryMode.ANY,
    });
    expect(result.forcedOnlineOnly).toBe(true);
    expect(result.items[0].deliveryModeShown).toBe(TutorSearchDeliveryMode.ONLINE);
    expect(result.items[0].distanceKm).toBeNull();
  });

  it('returns a public preview without bank or document fields', async () => {
    findOfferings.mockResolvedValue([tutorRow(1)]);
    findRateCards.mockResolvedValue(new Map([[1, completeCard]]));
    calendarGetRawMany.mockResolvedValue([{ tutorId: 1, count: '2' }]);
    const detail = await service.getTutorSearchDetail(
      studentUser as never,
      1,
      33,
    );
    expect(detail.tutorId).toBe(1);
    expect(detail.displayName).toBe('Tutor 1');
    expect(detail.matchingOffering.offeringLabel).toContain('Mathematics');
    expect(detail.hasAvailabilityThisWeek).toBe(true);
    expect(detail.slotsThisWeek).toBe(2);
    expect(detail).not.toHaveProperty('bankDetails');
    expect(detail).not.toHaveProperty('documents');
  });

  it('rejects preview when the matching offering is not available', async () => {
    findOfferings.mockResolvedValue([tutorRow(1)]);
    findRateCards.mockResolvedValue(new Map());
    await expect(
      service.getTutorSearchDetail(studentUser as never, 1, 33),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
