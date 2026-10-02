import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../auth/enums/user-role.enum';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';
import { TutorBookingSchedulingStatus } from '../enums/tutor-booking-status.enum';
import { TutorClassBookingService } from './tutor-class-booking.service';

describe('TutorClassBookingService', () => {
  const now = new Date('2026-10-02T12:00:00Z');
  const tutorUser = { id: 4, role: UserRole.TUTOR } as never;

  function serviceWith(rows: unknown[], tutor: { id: number } | null = { id: 9 }) {
    const andWhere = jest.fn().mockReturnThis();
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere,
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rows),
    };
    const creditRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    const tutorRepo = {
      findOne: jest.fn().mockResolvedValue(tutor),
    };
    const offeringService = {
      findAll: jest.fn().mockResolvedValue([]),
    };
    return {
      service: new TutorClassBookingService(
        creditRepo as never,
        tutorRepo as never,
        offeringService as never,
      ),
      andWhere,
      tutorRepo,
      offeringService,
    };
  }

  it('rejects a missing tutor profile and scopes the query to the signed-in tutor', async () => {
    const missing = serviceWith([]);
    missing.tutorRepo.findOne.mockResolvedValue(null);
    await expect(missing.service.list(tutorUser, {}, now)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const { service, andWhere, tutorRepo } = serviceWith([]);
    await service.list(tutorUser, {}, now);
    expect(tutorRepo.findOne).toHaveBeenCalledWith({
      where: { userId: 4, deleted: false },
    });
    expect(andWhere).toHaveBeenCalledWith('credit.tutor_id = :tutorId', { tutorId: 9 });
  });

  it('applies email or mobile and offering filters before grouping', async () => {
    const { service, andWhere } = serviceWith([
      {
        orderItemId: '15',
        studentFirstName: 'Ada',
        studentLastName: 'Lovelace',
        catalogOfferingId: null,
        tutorCatalogOfferingId: null,
        tutorLeafDisplayName: 'Mathematics',
        deliveryMode: ClassSessionDeliveryModeEnum.offline,
        status: ClassCreditStatusEnum.unscheduled,
        startsAt: null,
        durationMinutes: 60,
        unitRateInr: '500',
        orderItemQuantity: '1',
        lineSubtotalInr: '500',
        orderItemDiscountInr: '0',
        orderItemCgstInr: '0',
        orderItemSgstInr: '0',
        orderItemIgstInr: '0',
        createdDate: '2026-09-20T00:00:00.000Z',
        isDemo: false,
      },
    ]);

    const result = await service.list(
      tutorUser,
      {
        studentSearch: '9990001111',
        offeringSearch: 'Math',
        schedulingStatus: TutorBookingSchedulingStatus.unscheduled,
        page: 1,
        pageSize: 20,
      },
      now,
    );

    const clauses = andWhere.mock.calls.map((call) => String(call[0]));
    expect(clauses.some((clause) => clause.includes('studentUser.email'))).toBe(true);
    expect(clauses.some((clause) => clause.includes('firstName'))).toBe(false);
    expect(clauses.some((clause) => clause.includes('offering.display_name'))).toBe(false);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      orderItemId: 15,
      studentName: 'Ada Lovelace',
      offeringLabel: 'Mathematics',
      deliveryMode: ClassSessionDeliveryModeEnum.offline,
      classCount: 1,
      linePaidInr: 500,
      schedulingStatus: TutorBookingSchedulingStatus.unscheduled,
    });
  });

  it('shows the booked catalog offering, such as CBSE class 11 Economics', async () => {
    const { service, offeringService } = serviceWith([
      {
        orderItemId: '21',
        studentFirstName: 'Ada',
        studentLastName: 'Lovelace',
        catalogOfferingId: '11011',
        tutorCatalogOfferingId: '11001',
        tutorLeafDisplayName: 'Economics',
        deliveryMode: ClassSessionDeliveryModeEnum.online,
        status: ClassCreditStatusEnum.unscheduled,
        startsAt: null,
        durationMinutes: 60,
        unitRateInr: '0',
        orderItemQuantity: '1',
        lineSubtotalInr: '0',
        orderItemDiscountInr: '0',
        orderItemCgstInr: '0',
        orderItemSgstInr: '0',
        orderItemIgstInr: '0',
        createdDate: '2026-09-20T00:00:00.000Z',
        isDemo: true,
      },
    ]);
    offeringService.findAll.mockResolvedValue([
      { id: 1, displayName: 'School Education', level: 0, mediumOfInstruction: 1 },
      {
        id: 10,
        displayName: 'CBSE',
        level: 1,
        mediumOfInstruction: 1,
        parentOffering: { id: 1 },
      },
      {
        id: 101,
        displayName: 'Class 1',
        level: 2,
        mediumOfInstruction: 1,
        parentOffering: { id: 10 },
      },
      {
        id: 111,
        displayName: 'Class 11',
        level: 2,
        mediumOfInstruction: 1,
        parentOffering: { id: 10 },
      },
      {
        id: 11001,
        displayName: 'Economics',
        level: 3,
        mediumOfInstruction: 1,
        parentOffering: { id: 101 },
      },
      {
        id: 11011,
        displayName: 'Economics',
        level: 3,
        mediumOfInstruction: 1,
        parentOffering: { id: 111 },
      },
    ]);

    const result = await service.list(tutorUser, { offeringSearch: 'class 11' }, now);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].offeringLabel).toBe('CBSE | Economics | Classes 11');

    const otherSubject = await service.list(tutorUser, { offeringSearch: 'physics' }, now);
    expect(otherSubject.items).toHaveLength(0);
  });

  it('rejects non-tutor callers', async () => {
    const { service } = serviceWith([]);
    await expect(
      service.list({ id: 1, role: UserRole.STUDENT } as never, {}, now),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
