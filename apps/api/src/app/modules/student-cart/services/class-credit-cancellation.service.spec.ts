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
      { transaction } as never,
      {
        find: creditFind,
        createQueryBuilder: () => queryBuilder(null),
      } as never,
      { createQueryBuilder: () => queryBuilder([]) } as never,
      {
        createQueryBuilder: () => queryBuilder([]),
        create: (row: unknown) => row,
        save: jest.fn(),
      } as never,
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
});
