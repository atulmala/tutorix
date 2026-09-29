import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../auth/enums/user-role.enum';
import { TutorCalendar } from '../../tutor-calendar/entities/tutor-calendar.entity';
import { TutorClassSessionEnrollmentEntity } from '../entities/tutor-class-session-enrollment.entity';
import { TutorClassSessionEntity } from '../entities/tutor-class-session.entity';
import { ClassSessionDeliveryModeEnum } from '../enums/class-session-delivery-mode.enum';
import { ClassSessionEnrollmentStatusEnum } from '../enums/class-session-enrollment-status.enum';
import { ClassSessionStatusEnum } from '../enums/class-session-status.enum';
import { TutorClassSessionService } from './tutor-class-session.service';

describe('TutorClassSessionService', () => {
  const studentUser = { id: 9, role: UserRole.STUDENT };
  const future = new Date(Date.now() + 36 * 60 * 60 * 1000);
  const tutorOffering = {
    id: 80,
    tutorId: 3,
    offeringId: 30,
    tutor: {
      id: 3,
      deleted: false,
      onBoardingComplete: true,
      userId: 4,
      user: { firstName: 'Priya', lastName: 'Sharma' },
    },
    offering: { displayName: 'Mathematics' },
  };
  const rateCard = {
    offlineEnabled: true,
    offlineBaseRate: 500,
    offlineBaseDiscountPct: 0,
    offlineBatchSize: 1,
    onlineEnabled: true,
    onlineBaseRate: 400,
    onlineBaseDiscountPct: 0,
    onlineBatchSize: 4,
  };

  let findStudent: jest.Mock;
  let findRateCard: jest.Mock;
  let findCoveringTest: jest.Mock;
  let calendarFind: jest.Mock;
  let calendarFindOne: jest.Mock;
  let offeringFindOne: jest.Mock;
  let sessionFind: jest.Mock;
  let enrollmentQuery: jest.Mock;
  let findTutor: jest.Mock;
  let ensureWallet: jest.Mock;
  let debitWithManager: jest.Mock;
  let emit: jest.Mock;
  let lockedSlot: TutorCalendar | null;
  let lockedSession: TutorClassSessionEntity | null;
  let lockedEnrollments: TutorClassSessionEnrollmentEntity[];
  let savedSession: TutorClassSessionEntity;
  let savedEnrollment: TutorClassSessionEnrollmentEntity;
  let service: TutorClassSessionService;

  function createQueryBuilder(getOne: () => unknown, getMany: () => unknown) {
    return {
      setLock: () => ({
        where: () => ({
          andWhere: () => ({
            getOne,
            andWhere: () => ({
              getOne,
              getMany,
            }),
            getMany,
          }),
        }),
      }),
    };
  }

  beforeEach(() => {
    findStudent = jest.fn().mockResolvedValue({
      id: 21,
      userId: 9,
      user: { firstName: 'Ada', lastName: 'Lovelace' },
    });
    findRateCard = jest.fn().mockResolvedValue(rateCard);
    findCoveringTest = jest.fn().mockResolvedValue(null);
    calendarFind = jest.fn().mockResolvedValue([]);
    calendarFindOne = jest.fn().mockResolvedValue({
      id: 11,
      tutorId: 3,
      startsAt: future,
      durationMinutes: 60,
      deleted: false,
    });
    offeringFindOne = jest.fn().mockResolvedValue(tutorOffering);
    sessionFind = jest.fn().mockResolvedValue([]);
    enrollmentQuery = jest.fn();
    findTutor = jest.fn().mockResolvedValue({ id: 3, userId: 4 });
    ensureWallet = jest.fn().mockResolvedValue({ id: 1, balanceInr: 1000 });
    debitWithManager = jest.fn().mockResolvedValue({ balanceInr: 600 });
    emit = jest.fn().mockResolvedValue(undefined);
    lockedSlot = {
      id: 11,
      tutorId: 3,
      startsAt: future,
      durationMinutes: 60,
      deleted: false,
    } as TutorCalendar;
    lockedSession = null;
    lockedEnrollments = [];
    savedSession = {
      id: 90,
      tutorCalendarId: 11,
      tutorOfferingId: 80,
      deliveryMode: ClassSessionDeliveryModeEnum.offline,
      batchSize: 1,
      status: ClassSessionStatusEnum.open,
    } as TutorClassSessionEntity;
    savedEnrollment = {
      id: 70,
      sessionId: 90,
      studentId: 21,
      status: ClassSessionEnrollmentStatusEnum.confirmed,
    } as TutorClassSessionEnrollmentEntity;

    const dataSource = {
      getRepository: () => ({ findOne: findTutor }),
      transaction: jest.fn(async (fn: (manager: unknown) => unknown) =>
        fn({
          getRepository: (entity: unknown) => {
            if (entity === TutorCalendar) {
              return {
                createQueryBuilder: () =>
                  createQueryBuilder(
                    () => lockedSlot,
                    () => [],
                  ),
              };
            }
            if (entity === TutorClassSessionEntity) {
              return {
                createQueryBuilder: () =>
                  createQueryBuilder(
                    () => lockedSession,
                    () => [],
                  ),
                create: (value: TutorClassSessionEntity) => value,
                save: jest.fn(async (value: Partial<TutorClassSessionEntity>) => {
                  savedSession = {
                    ...savedSession,
                    ...value,
                    id: value.id ?? 90,
                  } as TutorClassSessionEntity;
                  lockedSession = savedSession;
                  return savedSession;
                }),
              };
            }
            if (entity === TutorClassSessionEnrollmentEntity) {
              return {
                createQueryBuilder: () =>
                  createQueryBuilder(
                    () => null,
                    () => lockedEnrollments,
                  ),
                create: (value: TutorClassSessionEnrollmentEntity) => value,
                save: jest.fn(async (value: Partial<TutorClassSessionEnrollmentEntity>) => {
                  savedEnrollment = {
                    ...savedEnrollment,
                    ...value,
                    id: 70,
                  } as TutorClassSessionEnrollmentEntity;
                  lockedEnrollments = [...lockedEnrollments, savedEnrollment];
                  return savedEnrollment;
                }),
              };
            }
            throw new Error('Unexpected entity');
          },
        }),
      ),
    };

    service = new TutorClassSessionService(
      { findByUserId: findStudent } as never,
      { findByTutorOfferingId: findRateCard } as never,
      { findActiveTestForOffering: findCoveringTest } as never,
      {
        ensureWalletForUser: ensureWallet,
        debitPurchaseWithManager: debitWithManager,
      } as never,
      { emit } as never,
      dataSource as never,
      { find: calendarFind, findOne: calendarFindOne } as never,
      { findOne: offeringFindOne } as never,
      { find: sessionFind } as never,
      { createQueryBuilder: enrollmentQuery } as never,
    );
  });

  it('returns no bookable slots when the tutor calendar is empty', async () => {
    const slots = await service.listBookableSlots(
      studentUser as never,
      3,
      30,
      ClassSessionDeliveryModeEnum.offline,
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
    expect(slots).toEqual([]);
  });

  it('shows the rate-card batch size for an empty 1:1 slot', async () => {
    calendarFind.mockResolvedValue([
      { id: 11, tutorId: 3, startsAt: future, durationMinutes: 60 },
    ]);

    const slots = await service.listBookableSlots(
      studentUser as never,
      3,
      30,
      ClassSessionDeliveryModeEnum.offline,
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    expect(slots).toEqual([
      { tutorCalendarId: 11, startsAt: future, seatsLeft: 1, batchSize: 1 },
    ]);
  });

  it('keeps a batch slot bookable while seats remain', async () => {
    calendarFind.mockResolvedValue([
      { id: 11, tutorId: 3, startsAt: future, durationMinutes: 60 },
    ]);
    sessionFind.mockResolvedValue([
      {
        tutorCalendarId: 11,
        tutorOfferingId: 80,
        deliveryMode: ClassSessionDeliveryModeEnum.online,
        batchSize: 4,
        status: ClassSessionStatusEnum.open,
        enrollments: [
          {
            studentId: 99,
            deleted: false,
            status: ClassSessionEnrollmentStatusEnum.confirmed,
          },
        ],
      },
    ]);

    const slots = await service.listBookableSlots(
      studentUser as never,
      3,
      30,
      ClassSessionDeliveryModeEnum.online,
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    expect(slots).toEqual([
      { tutorCalendarId: 11, startsAt: future, seatsLeft: 3, batchSize: 4 },
    ]);
  });

  it('hides a slot already taken by another offering', async () => {
    calendarFind.mockResolvedValue([
      { id: 11, tutorId: 3, startsAt: future, durationMinutes: 60 },
    ]);
    sessionFind.mockResolvedValue([
      {
        tutorCalendarId: 11,
        tutorOfferingId: 81,
        deliveryMode: ClassSessionDeliveryModeEnum.offline,
        batchSize: 1,
        status: ClassSessionStatusEnum.open,
        enrollments: [],
      },
    ]);

    const slots = await service.listBookableSlots(
      studentUser as never,
      3,
      30,
      ClassSessionDeliveryModeEnum.offline,
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    expect(slots).toEqual([]);
  });

  it('rejects direct bookTutorClass in favor of cart checkout', async () => {
    await expect(
      service.bookTutorClass(
        studentUser as never,
        11,
        30,
        ClassSessionDeliveryModeEnum.offline,
      ),
    ).rejects.toThrow(/cart/);
    expect(debitWithManager).not.toHaveBeenCalled();
  });

  it('lists a scheduled demo on the tutor schedule', async () => {
    const startsAt = new Date('2026-09-29T10:30:00.000Z');
    const chain = {
      innerJoinAndSelect: jest.fn(),
      leftJoinAndSelect: jest.fn(),
      innerJoinAndMapOne: jest.fn(),
      leftJoinAndMapOne: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      orderBy: jest.fn(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 5,
          bookedStudent: { user: { firstName: 'Ruchi', lastName: 'Sharma' } },
          classCredit: { isDemo: true },
          session: {
            id: 5,
            deliveryMode: ClassSessionDeliveryModeEnum.offline,
            tutorCalendar: { id: 11, startsAt, durationMinutes: 60 },
            tutorOffering: { offering: { displayName: 'Economics' } },
          },
        },
      ]),
    };
    chain.innerJoinAndSelect.mockReturnValue(chain);
    chain.leftJoinAndSelect.mockReturnValue(chain);
    chain.innerJoinAndMapOne.mockReturnValue(chain);
    chain.leftJoinAndMapOne.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.andWhere.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    enrollmentQuery.mockReturnValue(chain);

    const rows = await service.listTutorBookedSessions(
      { id: 4, role: UserRole.TUTOR } as never,
      new Date('2026-09-29T00:00:00.000Z'),
      new Date('2026-09-30T00:00:00.000Z'),
    );

    expect(rows).toEqual([
      {
        enrollmentId: 5,
        sessionId: 5,
        tutorCalendarId: 11,
        startsAt,
        durationMinutes: 60,
        deliveryMode: ClassSessionDeliveryModeEnum.offline,
        offeringLabel: 'Economics',
        studentName: 'Ruchi Sharma',
        isDemo: true,
      },
    ]);
  });

  it('rejects a student asking for the tutor schedule', async () => {
    await expect(
      service.listTutorBookedSessions(
        studentUser as never,
        new Date('2026-09-29T00:00:00.000Z'),
        new Date('2026-09-30T00:00:00.000Z'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
