import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../../auth/enums/user-role.enum';
import { OrderItemTypeEnum } from '../../commerce/enums/commerce.enums';
import { TutorCalendar } from '../../tutor-calendar/entities/tutor-calendar.entity';
import { TutorClassSessionEnrollmentEntity } from '../../tutor-class-session/entities/tutor-class-session-enrollment.entity';
import { TutorClassSessionEntity } from '../../tutor-class-session/entities/tutor-class-session.entity';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { ClassSessionEnrollmentStatusEnum } from '../../tutor-class-session/enums/class-session-enrollment-status.enum';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';
import { StudentClassCreditService } from './student-class-credit.service';

describe('StudentClassCreditService', () => {
  const studentUser = { id: 9, role: UserRole.STUDENT };
  const future = new Date(Date.now() + 36 * 60 * 60 * 1000);
  const tutorOffering = {
    id: 80,
    tutorId: 3,
    offeringId: 30,
    tutor: {
      id: 3,
      userId: 4,
      user: { firstName: 'Priya', lastName: 'Sharma' },
    },
    offering: { displayName: 'Mathematics' },
  };

  let findStudent: jest.Mock;
  let findRateCard: jest.Mock;
  let creditSave: jest.Mock;
  let creditCount: jest.Mock;
  let creditFind: jest.Mock;
  let creditFindOne: jest.Mock;
  let offeringFindOne: jest.Mock;
  let orderItemSave: jest.Mock;
  let emit: jest.Mock;
  let lockedSlot: TutorCalendar | null;
  let lockedSession: TutorClassSessionEntity | null;
  let lockedEnrollments: TutorClassSessionEnrollmentEntity[];
  let savedEnrollment: TutorClassSessionEnrollmentEntity;
  let service: StudentClassCreditService;

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
    findRateCard = jest.fn().mockResolvedValue({
      offlineEnabled: true,
      offlineBatchSize: 1,
      onlineEnabled: true,
      onlineBatchSize: 4,
    });
    creditSave = jest.fn(async (rows) => rows);
    creditCount = jest.fn().mockResolvedValue(0);
    creditFind = jest.fn().mockResolvedValue([]);
    creditFindOne = jest.fn();
    offeringFindOne = jest.fn().mockResolvedValue({ id: 80, tutorId: 3 });
    orderItemSave = jest.fn(async (item) => item);
    emit = jest.fn().mockResolvedValue(undefined);
    lockedSlot = {
      id: 90,
      tutorId: 3,
      startsAt: future,
      durationMinutes: 60,
    } as TutorCalendar;
    lockedSession = null;
    lockedEnrollments = [];
    savedEnrollment = {
      id: 70,
      sessionId: 55,
      studentId: 21,
      status: ClassSessionEnrollmentStatusEnum.confirmed,
    } as TutorClassSessionEnrollmentEntity;

    const manager = {
      getRepository: (entity: unknown) => {
        if (entity === TutorCalendar) {
          return {
            createQueryBuilder: () =>
              createQueryBuilder(() => lockedSlot, () => []),
          };
        }
        if (entity === TutorClassSessionEntity) {
          return {
            createQueryBuilder: () =>
              createQueryBuilder(() => lockedSession, () => []),
            create: (row: TutorClassSessionEntity) => row,
            save: jest.fn(async (row: TutorClassSessionEntity) => {
              lockedSession = { ...row, id: row.id ?? 55 } as TutorClassSessionEntity;
              return lockedSession;
            }),
          };
        }
        if (entity === TutorClassSessionEnrollmentEntity) {
          return {
            createQueryBuilder: () =>
              createQueryBuilder(() => lockedEnrollments[0] ?? null, () => lockedEnrollments),
            count: jest.fn().mockResolvedValue(0),
            create: (row: TutorClassSessionEnrollmentEntity) => row,
            save: jest.fn(async (row: TutorClassSessionEnrollmentEntity) => {
              savedEnrollment = { ...row, id: row.id ?? 70 } as TutorClassSessionEnrollmentEntity;
              return savedEnrollment;
            }),
          };
        }
        return {
          save: jest.fn(async (row: unknown) => row),
        };
      },
    };

    service = new StudentClassCreditService(
      { findByUserId: findStudent } as never,
      { findByTutorOfferingId: findRateCard } as never,
      { emit } as never,
      { transaction: async (fn: (mgr: typeof manager) => unknown) => fn(manager) } as never,
      {
        save: creditSave,
        count: creditCount,
        find: creditFind,
        findOne: creditFindOne,
        create: (row: unknown) => row,
      } as never,
      { find: jest.fn(), save: orderItemSave } as never,
      { findOne: offeringFindOne } as never,
    );
  });

  it('creates one unscheduled credit per purchased hour', async () => {
    const item = {
      id: 77,
      itemType: OrderItemTypeEnum.CLASS_BOOKING,
      referenceId: 80,
      quantity: 3,
      fulfillmentStatus: 'pending',
    };

    await service.fulfillPaidOrder(
      { id: 40, items: [item] } as never,
      21,
      [
        {
          tutorOfferingId: 80,
          quantity: 3,
          deliveryMode: ClassSessionDeliveryModeEnum.offline,
        } as never,
      ],
    );

    expect(creditSave).toHaveBeenCalledTimes(1);
    const saved = creditSave.mock.calls[0][0] as Array<{ status: string }>;
    expect(saved).toHaveLength(3);
    expect(saved.every((row) => row.status === ClassCreditStatusEnum.unscheduled)).toBe(
      true,
    );
    expect(item.fulfillmentStatus).toBe('fulfilled');
  });

  it('does not create a second set of credits for the same order item', async () => {
    creditCount.mockResolvedValue(3);
    const item = {
      id: 77,
      itemType: OrderItemTypeEnum.CLASS_BOOKING,
      referenceId: 80,
      quantity: 3,
      fulfillmentStatus: 'pending',
    };

    await service.fulfillPaidOrder({ id: 40, items: [item] } as never, 21, []);

    expect(creditSave).not.toHaveBeenCalled();
    expect(item.fulfillmentStatus).toBe('fulfilled');
  });

  it('schedules an unscheduled credit onto a bookable slot without a wallet debit', async () => {
    creditFindOne.mockResolvedValue({
      id: 12,
      studentId: 21,
      status: ClassCreditStatusEnum.unscheduled,
      deliveryMode: ClassSessionDeliveryModeEnum.offline,
      enrollmentId: null,
      tutorOffering,
    });

    const result = await service.schedule(studentUser as never, 12, 90);

    expect(result).toEqual({
      creditId: 12,
      enrollmentId: 70,
      sessionId: 55,
    });
    expect(emit).toHaveBeenCalled();
  });

  it('rejects scheduling a credit that is already scheduled', async () => {
    creditFindOne.mockResolvedValue({
      id: 12,
      studentId: 21,
      status: ClassCreditStatusEnum.scheduled,
      deliveryMode: ClassSessionDeliveryModeEnum.offline,
      tutorOffering,
    });

    await expect(service.schedule(studentUser as never, 12, 90)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
