import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../../auth/enums/user-role.enum';
import { ClassCreditCancellationEntity } from '../entities/class-credit-cancellation.entity';
import { StudentClassCreditEntity } from '../entities/student-class-credit.entity';
import { ClassCreditRefundMethodEnum } from '../enums/class-credit-refund-method.enum';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';
import { ClassCreditCancellationService } from './class-credit-cancellation.service';

describe('ClassCreditCancellationService', () => {
  const studentUser = { id: 9, role: UserRole.STUDENT };
  const orderItem = {
    lineSubtotalInr: 2000,
    discountInr: 0,
    cgstInr: 0,
    sgstInr: 0,
    igstInr: 0,
    quantity: 4,
  };
  let creditFind: jest.Mock;
  let creditFindOne: jest.Mock;
  let findTutor: jest.Mock;
  let emitMail: jest.Mock;
  let creditSave: jest.Mock;
  let cancellationSave: jest.Mock;
  let creditClassRefund: jest.Mock;
  let refundPayment: jest.Mock;
  let transaction: jest.Mock;
  let service: ClassCreditCancellationService;

  function queryBuilder(result: unknown) {
    const builder = {
      innerJoin: () => builder,
      where: () => builder,
      andWhere: () => builder,
      orderBy: () => builder,
      select: () => builder,
      addSelect: () => builder,
      groupBy: () => builder,
      setLock: () => builder,
      getMany: async () => result,
      getRawMany: async () => result,
      getOne: async () => result,
    };
    return builder;
  }

  beforeEach(() => {
    creditFind = jest.fn();
    creditFindOne = jest.fn();
    findTutor = jest.fn().mockResolvedValue({ id: 71, userId: 4 });
    emitMail = jest.fn().mockResolvedValue(undefined);
    creditSave = jest.fn(async (row) => row);
    cancellationSave = jest.fn(async (row) => row);
    creditClassRefund = jest.fn(async () => ({ balanceInr: 1500 }));
    refundPayment = jest.fn();
    transaction = jest.fn(async (fn: (mgr: unknown) => unknown) =>
      fn({
        getRepository: () => ({
          createQueryBuilder: () => queryBuilder(null),
          create: (row: unknown) => row,
          save: jest.fn(async (row) => row),
          count: jest.fn().mockResolvedValue(0),
        }),
      }),
    );

    service = new ClassCreditCancellationService(
      { findByUserId: jest.fn().mockResolvedValue({ id: 21, userId: 9 }) } as never,
      { creditClassRefundWithManager: creditClassRefund } as never,
      { refundPayment } as never,
      { transaction, getRepository: () => ({ findOne: findTutor }) } as never,
      {
        find: creditFind,
        findOne: creditFindOne,
        createQueryBuilder: () => queryBuilder(null),
      } as never,
      { createQueryBuilder: () => queryBuilder([]) } as never,
      {
        createQueryBuilder: () => queryBuilder([]),
        create: (row: unknown) => row,
        save: jest.fn(),
      } as never,
      { emit: emitMail } as never,
    );
  });

  it('returns an unscheduled class amount to the wallet', async () => {
    const credit = {
      id: 12,
      studentId: 21,
      orderId: 40,
      status: ClassCreditStatusEnum.unscheduled,
      enrollmentId: null,
      orderItem,
    };
    creditFind.mockResolvedValue([credit]);
    const locked = { ...credit };
    transaction.mockImplementation(async (fn: (mgr: unknown) => unknown) =>
      fn({
        getRepository: (entity: unknown) => {
          if (entity === StudentClassCreditEntity) {
            return {
              createQueryBuilder: () => queryBuilder(locked),
              save: creditSave,
            };
          }
          if (entity === ClassCreditCancellationEntity) {
            return { create: (row: unknown) => row, save: cancellationSave };
          }
          return {
            createQueryBuilder: () => queryBuilder(null),
            count: jest.fn().mockResolvedValue(0),
            create: (row: unknown) => row,
            save: jest.fn(async (row) => row),
          };
        },
      }),
    );

    const result = await service.cancel(
      studentUser as never,
      [12],
      ClassCreditRefundMethodEnum.wallet,
    );

    expect(result).toMatchObject({
      cancelledCount: 1,
      amountInr: 500,
      refundMethod: ClassCreditRefundMethodEnum.wallet,
      walletBalanceInr: 1500,
    });
    expect(locked.status).toBe(ClassCreditStatusEnum.cancelled);
    expect(creditClassRefund).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 9, amountInr: 500 }),
    );
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it('rejects a class that has already started', async () => {
    creditFind.mockResolvedValue([
      {
        id: 12,
        studentId: 21,
        status: ClassCreditStatusEnum.scheduled,
        enrollment: {
          session: { tutorCalendar: { startsAt: new Date(Date.now() - 60_000) } },
        },
        orderItem,
      },
    ]);

    await expect(
      service.cancel(studentUser as never, [12], ClassCreditRefundMethodEnum.wallet),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(creditClassRefund).not.toHaveBeenCalled();
  });

  it('rejects a tutor change inside the offline lead time', async () => {
    creditFindOne.mockResolvedValue({
      id: 12,
      studentId: 21,
      tutorId: 71,
      enrollmentId: 5,
      status: ClassCreditStatusEnum.scheduled,
      deliveryMode: 'offline',
      enrollment: {
        session: {
          tutorCalendar: { startsAt: new Date(Date.now() + 20 * 60 * 1000) },
        },
      },
    });

    await expect(
      service.cancelScheduledClassByTutor({ id: 4, role: UserRole.TUTOR } as never, 5),
    ).rejects.toThrow(/30 minutes before/);
    expect(creditClassRefund).not.toHaveBeenCalled();
  });

  it('rejects a gateway refund when no captured payment can cover it', async () => {
    creditFind.mockResolvedValue([
      {
        id: 12,
        studentId: 21,
        status: ClassCreditStatusEnum.unscheduled,
        orderItem,
      },
    ]);

    await expect(
      service.cancel(studentUser as never, [12], ClassCreditRefundMethodEnum.gateway),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(creditClassRefund).not.toHaveBeenCalled();
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it('refunds the student wallet when a tutor cancels a future class', async () => {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000);
    const credit = {
      id: 12,
      studentId: 21,
      tutorId: 71,
      orderId: 40,
      enrollmentId: 5,
      status: ClassCreditStatusEnum.scheduled,
      deliveryMode: 'offline',
      orderItem,
      student: { userId: 9, user: { firstName: 'Ruchi', lastName: 'Shah' } },
      tutorOffering: {
        offering: { displayName: 'Economics' },
        tutor: { user: { firstName: 'Navya', lastName: 'Iyer' } },
      },
      enrollment: { session: { tutorCalendar: { startsAt, durationMinutes: 60 } } },
    };
    creditFindOne.mockResolvedValue(credit);
    const locked = { ...credit };
    transaction.mockImplementation(async (fn: (mgr: unknown) => unknown) =>
      fn({
        getRepository: (entity: unknown) => {
          if (entity === StudentClassCreditEntity) {
            return {
              createQueryBuilder: () => queryBuilder(locked),
              save: creditSave,
            };
          }
          if (entity === ClassCreditCancellationEntity) {
            return { create: (row: unknown) => row, save: cancellationSave };
          }
          return {
            createQueryBuilder: () => queryBuilder(null),
            count: jest.fn().mockResolvedValue(0),
            create: (row: unknown) => row,
            save: jest.fn(async (row) => row),
          };
        },
      }),
    );

    const result = await service.cancelScheduledClassByTutor(
      { id: 4, role: UserRole.TUTOR } as never,
      5,
    );

    expect(result.amountRefundedInr).toBe(500);
    expect(locked.status).toBe(ClassCreditStatusEnum.cancelled);
    expect(locked.enrollmentId).toBeNull();
    expect(creditClassRefund).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 9, amountInr: 500 }),
    );
    expect(emitMail).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'CLASS_CANCELLED_BY_TUTOR',
        userId: 9,
        audience: 'STUDENT',
        payload: expect.objectContaining({ amountRefunded: '₹500' }),
      }),
    );
  });

  it('refunds every student when a tutor cancels a shared class', async () => {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000);
    const session = { id: 8, tutorCalendar: { startsAt, durationMinutes: 60 } };
    const shared = {
      tutorId: 71,
      orderId: 40,
      status: ClassCreditStatusEnum.scheduled,
      deliveryMode: 'online',
      orderItem,
      tutorOffering: {
        offering: { displayName: 'Economics' },
        tutor: { user: { firstName: 'Navya', lastName: 'Iyer' } },
      },
      enrollment: { session },
    };
    const first = {
      ...shared,
      id: 12,
      studentId: 21,
      enrollmentId: 5,
      student: { userId: 9, user: { firstName: 'Ruchi', lastName: 'Shah' } },
    };
    const second = {
      ...shared,
      id: 13,
      studentId: 22,
      enrollmentId: 6,
      student: { userId: 10, user: { firstName: 'Amit', lastName: 'Kumar' } },
    };
    creditFindOne.mockResolvedValue(first);
    creditFind.mockResolvedValue([first, second]);
    const locked = [{ ...first }, { ...second }];
    let lockIndex = 0;
    transaction.mockImplementation(async (fn: (mgr: unknown) => unknown) =>
      fn({
        getRepository: (entity: unknown) => {
          if (entity === StudentClassCreditEntity) {
            return {
              createQueryBuilder: () => ({
                setLock: () => ({
                  where: () => ({
                    andWhere: () => ({
                      andWhere: () => ({
                        getOne: async () => locked[lockIndex++],
                      }),
                    }),
                  }),
                }),
              }),
              save: creditSave,
            };
          }
          if (entity === ClassCreditCancellationEntity) {
            return { create: (row: unknown) => row, save: cancellationSave };
          }
          return {
            createQueryBuilder: () => queryBuilder(null),
            count: jest.fn().mockResolvedValue(0),
            create: (row: unknown) => row,
            save: jest.fn(async (row) => row),
          };
        },
      }),
    );

    const result = await service.cancelScheduledClassByTutor(
      { id: 4, role: UserRole.TUTOR } as never,
      5,
    );

    expect(result.amountRefundedInr).toBe(1000);
    expect(locked.map((row) => row.status)).toEqual([
      ClassCreditStatusEnum.cancelled,
      ClassCreditStatusEnum.cancelled,
    ]);
    expect(creditClassRefund).toHaveBeenCalledTimes(2);
    expect(creditClassRefund).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 9, amountInr: 500 }),
    );
    expect(creditClassRefund).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 10, amountInr: 500 }),
    );
    expect(emitMail).toHaveBeenCalledTimes(2);
  });

  it('returns a class to unscheduled when the tutor asks for a new time', async () => {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000);
    const credit = {
      id: 12,
      studentId: 21,
      tutorId: 71,
      orderId: 40,
      enrollmentId: 5,
      status: ClassCreditStatusEnum.scheduled,
      deliveryMode: 'offline',
      orderItem,
      student: { userId: 9, user: { firstName: 'Ruchi', lastName: 'Shah' } },
      tutorOffering: {
        offering: { displayName: 'Economics' },
        tutor: { user: { firstName: 'Navya', lastName: 'Iyer' } },
      },
      enrollment: { session: { tutorCalendar: { startsAt, durationMinutes: 60 } } },
    };
    creditFindOne.mockResolvedValue(credit);
    const locked = { ...credit };
    transaction.mockImplementation(async (fn: (mgr: unknown) => unknown) =>
      fn({
        getRepository: (entity: unknown) => {
          if (entity === StudentClassCreditEntity) {
            return {
              createQueryBuilder: () => queryBuilder(locked),
              save: creditSave,
            };
          }
          return {
            createQueryBuilder: () => queryBuilder(null),
            count: jest.fn().mockResolvedValue(0),
            create: (row: unknown) => row,
            save: jest.fn(async (row) => row),
          };
        },
      }),
    );

    const result = await service.requestRescheduleByTutor(
      { id: 4, role: UserRole.TUTOR } as never,
      5,
    );

    expect(result).toMatchObject({ enrollmentId: 5, amountRefundedInr: 0 });
    expect(locked.status).toBe(ClassCreditStatusEnum.unscheduled);
    expect(locked.enrollmentId).toBeNull();
    expect(creditClassRefund).not.toHaveBeenCalled();
    expect(cancellationSave).not.toHaveBeenCalled();
    expect(emitMail).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'CLASS_RESCHEDULE_REQUESTED',
        userId: 9,
      }),
    );
  });
});
