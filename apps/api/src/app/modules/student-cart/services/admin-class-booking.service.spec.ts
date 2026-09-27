import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';
import { AdminClassBookingService } from './admin-class-booking.service';

function makeQueryBuilder() {
  let cloneCount = 0;

  const countQb = {
    select: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ cnt: '1' }),
  };

  const orderPageQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([
      { orderId: '40', purchasedAt: new Date('2026-09-26T12:00:00Z') },
    ]),
  };

  const linesQb = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([
      {
        id: '1',
        studentId: '21',
        studentFirstName: 'Ada',
        studentLastName: 'Lovelace',
        studentEmail: 'ada@example.com',
        tutorId: '3',
        tutorOfferingId: '10',
        tutorFirstName: 'Priya',
        tutorLastName: 'Sharma',
        offeringLabel: 'Mathematics',
        deliveryMode: ClassSessionDeliveryModeEnum.offline,
        status: ClassCreditStatusEnum.scheduled,
        startsAt: new Date('2026-10-01T10:00:00Z'),
        orderId: '40',
        orderNumber: 'TX250926ABC',
        amountDueInr: '1200',
        amountPaidInr: '1200',
        unitRateInr: '500',
        orderItemQuantity: '1',
        lineSubtotalInr: '500',
        orderItemDiscountInr: '0',
        orderItemCgstInr: '45',
        orderItemSgstInr: '45',
        orderItemIgstInr: '0',
        createdDate: new Date('2026-09-26T00:00:00Z'),
      },
      {
        id: '2',
        studentId: '21',
        studentFirstName: 'Ada',
        studentLastName: 'Lovelace',
        studentEmail: 'ada@example.com',
        tutorId: '5',
        tutorOfferingId: '20',
        tutorFirstName: 'Raj',
        tutorLastName: 'Kumar',
        offeringLabel: 'English',
        deliveryMode: ClassSessionDeliveryModeEnum.online,
        status: ClassCreditStatusEnum.unscheduled,
        startsAt: null,
        orderId: '40',
        orderNumber: 'TX250926ABC',
        amountDueInr: '1200',
        amountPaidInr: '1200',
        unitRateInr: '400',
        orderItemQuantity: '1',
        lineSubtotalInr: '400',
        orderItemDiscountInr: '0',
        orderItemCgstInr: '36',
        orderItemSgstInr: '36',
        orderItemIgstInr: '0',
        createdDate: new Date('2026-09-26T01:00:00Z'),
      },
    ]),
  };

  const filteredQb = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    clone: jest.fn().mockImplementation(() => {
      cloneCount += 1;
      if (cloneCount === 1) {
        return countQb;
      }
      return orderPageQb;
    }),
  };

  const rootQb = filteredQb;

  let createCall = 0;
  const creditRepo = {
    createQueryBuilder: jest.fn().mockImplementation(() => {
      createCall += 1;
      if (createCall === 1) {
        return rootQb;
      }
      return linesQb;
    }),
  };

  return {
    creditRepo,
    filteredQb,
    linesQb,
    countQb,
    orderPageQb,
  };
}

describe('AdminClassBookingService', () => {
  it('groups credits by checkout and paginates distinct orders', async () => {
    const { creditRepo, filteredQb, linesQb } = makeQueryBuilder();

    const service = new AdminClassBookingService(creditRepo as never);
    const result = await service.list({
      studentSearch: 'Ada',
      tutorSearch: 'Priya',
      page: 1,
      pageSize: 20,
    });

    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      orderId: 40,
      orderNumber: 'TX250926ABC',
      studentName: 'Ada Lovelace',
      classCount: 2,
      tutorCount: 2,
      amountDueInr: 1200,
      amountPaidInr: 1200,
    });
    expect(result.items[0].lines).toHaveLength(2);
    expect(result.items[0].lines[0]).toMatchObject({
      tutorName: 'Priya Sharma',
      offeringLabel: 'Mathematics',
      classCount: 1,
    });
    expect(result.items[0].lines[1]).toMatchObject({
      tutorName: 'Raj Kumar',
      classCount: 1,
    });
    expect(filteredQb.andWhere).toHaveBeenCalled();
    expect(linesQb.andWhere).toHaveBeenCalledWith(
      'credit.order_id IN (:...orderIds)',
      { orderIds: [40] },
    );
  });
});
