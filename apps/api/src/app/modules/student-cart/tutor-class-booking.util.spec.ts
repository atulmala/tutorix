import { ClassSessionDeliveryModeEnum } from '../tutor-class-session/enums/class-session-delivery-mode.enum';
import { OrderItemPaidParts } from './admin-class-booking-order-item.util';
import { ClassCreditStatusEnum } from './enums/class-credit-status.enum';
import {
  TutorBookingConclusionStatus,
  TutorBookingSchedulingStatus,
} from './enums/tutor-booking-status.enum';
import {
  applyTutorClassBookingStudentSearch,
  groupTutorClassBookings,
  offeringLabelMatchesSearch,
  pageStudentClassBookings,
  pageTutorClassBookings,
  TutorClassBookingCreditSource,
} from './tutor-class-booking.util';

const paidParts = (quantity: number, lineSubtotalInr: number): OrderItemPaidParts => ({
  lineSubtotalInr,
  discountInr: 0,
  cgstInr: 0,
  sgstInr: 0,
  igstInr: 0,
  quantity,
});

function credit(
  overrides: Partial<TutorClassBookingCreditSource> & Pick<TutorClassBookingCreditSource, 'orderItemId'>,
): TutorClassBookingCreditSource {
  return {
    studentFirstName: 'Ada',
    studentLastName: 'Lovelace',
    offeringLabel: 'Mathematics',
    deliveryMode: ClassSessionDeliveryModeEnum.online,
    status: ClassCreditStatusEnum.unscheduled,
    startsAt: null,
    durationMinutes: 60,
    orderItemPaidParts: paidParts(1, 500),
    createdDate: new Date('2026-09-01T00:00:00Z'),
    isDemo: false,
    ...overrides,
  };
}

describe('tutor class booking search', () => {
  it('matches student login email or mobile and skips names', () => {
    const andWhere = jest.fn();
    applyTutorClassBookingStudentSearch({ andWhere }, 'ada@example.com');
    const [clause, params] = andWhere.mock.calls[0];
    expect(clause).toContain('studentUser.email ILIKE :studentSearchTerm');
    expect(clause).toContain('studentUser.mobile ILIKE :studentSearchTerm');
    expect(clause).toContain('studentUser.mobile_number ILIKE :studentSearchTerm');
    expect(clause).not.toContain('firstName');
    expect(clause).not.toContain('lastName');
    expect(params).toEqual({ studentSearchTerm: '%ada@example.com%' });
  });

  it('skips a blank student search', () => {
    const andWhere = jest.fn();
    applyTutorClassBookingStudentSearch({ andWhere }, '   ');
    expect(andWhere).not.toHaveBeenCalled();
  });

  it('matches the full offering label and skips a blank search', () => {
    expect(offeringLabelMatchesSearch('CBSE | Economics | Classes 11', 'class 11')).toBe(true);
    expect(offeringLabelMatchesSearch('CBSE | Economics | Classes 11', 'physics')).toBe(false);
    expect(offeringLabelMatchesSearch('CBSE | Economics | Classes 11', '   ')).toBe(true);
  });
});

describe('groupTutorClassBookings', () => {
  const now = new Date('2026-10-02T12:00:00Z');

  it('groups credits on one order item and sums the paid amount', () => {
    const rows = groupTutorClassBookings(
      [
        credit({
          orderItemId: 8,
          status: ClassCreditStatusEnum.scheduled,
          startsAt: new Date('2026-10-03T12:00:00Z'),
          orderItemPaidParts: paidParts(2, 1000),
          createdDate: new Date('2026-09-02T00:00:00Z'),
        }),
        credit({
          orderItemId: 8,
          status: ClassCreditStatusEnum.unscheduled,
          orderItemPaidParts: paidParts(2, 1000),
          createdDate: new Date('2026-09-01T00:00:00Z'),
        }),
      ],
      now,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      orderItemId: 8,
      studentName: 'Ada Lovelace',
      offeringLabel: 'Mathematics',
      classCount: 2,
      deliveryMode: ClassSessionDeliveryModeEnum.online,
      schedulingStatus: TutorBookingSchedulingStatus.partial,
      conclusionStatus: TutorBookingConclusionStatus.not_concluded,
      scheduledCount: 1,
      unscheduledCount: 1,
      cancelledCount: 0,
      concludedCount: 0,
      linePaidInr: 1000,
      isDemo: false,
    });
    expect(rows[0].bookedAt.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('keeps a later purchase as a separate row and sorts newest first', () => {
    const rows = groupTutorClassBookings(
      [
        credit({ orderItemId: 1, createdDate: new Date('2026-08-01T00:00:00Z') }),
        credit({
          orderItemId: 2,
          offeringLabel: 'English',
          createdDate: new Date('2026-09-01T00:00:00Z'),
        }),
      ],
      now,
    );

    expect(rows.map((row) => row.orderItemId)).toEqual([2, 1]);
  });

  it('marks a demo booking at zero amount', () => {
    const rows = groupTutorClassBookings(
      [
        credit({
          orderItemId: 3,
          isDemo: true,
          orderItemPaidParts: paidParts(1, 500),
        }),
      ],
      now,
    );

    expect(rows[0]).toMatchObject({ isDemo: true, linePaidInr: 0, classCount: 1 });
  });

  it('derives mixed scheduling and partial conclusion counts', () => {
    const rows = groupTutorClassBookings(
      [
        credit({
          orderItemId: 4,
          status: ClassCreditStatusEnum.scheduled,
          startsAt: new Date('2026-10-01T10:00:00Z'),
        }),
        credit({
          orderItemId: 4,
          status: ClassCreditStatusEnum.scheduled,
          startsAt: new Date('2026-10-03T10:00:00Z'),
        }),
        credit({
          orderItemId: 4,
          status: ClassCreditStatusEnum.unscheduled,
        }),
        credit({
          orderItemId: 4,
          status: ClassCreditStatusEnum.cancelled,
        }),
        credit({
          orderItemId: 4,
          status: ClassCreditStatusEnum.cancelled,
        }),
      ],
      now,
    );

    expect(rows[0]).toMatchObject({
      classCount: 5,
      schedulingStatus: TutorBookingSchedulingStatus.partial,
      conclusionStatus: TutorBookingConclusionStatus.partial,
      scheduledCount: 2,
      unscheduledCount: 1,
      cancelledCount: 2,
      concludedCount: 1,
    });
  });

  it('treats a fully scheduled booking as concluded when every class has ended', () => {
    const rows = groupTutorClassBookings(
      [
        credit({
          orderItemId: 5,
          status: ClassCreditStatusEnum.scheduled,
          startsAt: new Date('2026-10-01T08:00:00Z'),
        }),
        credit({
          orderItemId: 5,
          status: ClassCreditStatusEnum.cancelled,
        }),
      ],
      now,
    );

    expect(rows[0]).toMatchObject({
      schedulingStatus: TutorBookingSchedulingStatus.scheduled,
      conclusionStatus: TutorBookingConclusionStatus.concluded,
      concludedCount: 1,
    });
  });

  it('leaves conclusion empty when every class is cancelled', () => {
    const rows = groupTutorClassBookings(
      [
        credit({
          orderItemId: 6,
          status: ClassCreditStatusEnum.cancelled,
        }),
      ],
      now,
    );

    expect(rows[0]).toMatchObject({
      schedulingStatus: TutorBookingSchedulingStatus.cancelled,
      conclusionStatus: null,
    });
  });
});

describe('pageTutorClassBookings', () => {
  const now = new Date('2026-10-02T12:00:00Z');
  const groups = groupTutorClassBookings(
    [
      credit({ orderItemId: 1, createdDate: new Date('2026-08-01T00:00:00Z') }),
      credit({
        orderItemId: 2,
        status: ClassCreditStatusEnum.scheduled,
        startsAt: new Date('2026-10-01T08:00:00Z'),
        createdDate: new Date('2026-09-01T00:00:00Z'),
      }),
      credit({
        orderItemId: 3,
        status: ClassCreditStatusEnum.cancelled,
        createdDate: new Date('2026-09-15T00:00:00Z'),
      }),
    ],
    now,
  );

  it('paginates after status filters', () => {
    const page = pageTutorClassBookings(groups, { page: 1, pageSize: 1 });
    expect(page.totalCount).toBe(3);
    expect(page.totalPages).toBe(3);
    expect(page.items.map((item) => item.orderItemId)).toEqual([3]);

    const second = pageTutorClassBookings(groups, { page: 2, pageSize: 1 });
    expect(second.items.map((item) => item.orderItemId)).toEqual([2]);
  });

  it('filters scheduling and conclusion together', () => {
    const scheduled = pageTutorClassBookings(groups, {
      schedulingStatus: TutorBookingSchedulingStatus.scheduled,
      conclusionStatus: TutorBookingConclusionStatus.concluded,
    });
    expect(scheduled.items.map((item) => item.orderItemId)).toEqual([2]);

    const notConcluded = pageTutorClassBookings(groups, {
      conclusionStatus: TutorBookingConclusionStatus.not_concluded,
    });
    expect(notConcluded.items.map((item) => item.orderItemId)).toEqual([1]);
    expect(notConcluded.items.some((item) => item.conclusionStatus == null)).toBe(false);
  });
});

describe('pageStudentClassBookings', () => {
  const now = new Date('2026-10-02T12:00:00Z');
  const groups = groupTutorClassBookings(
    [
      credit({
        orderItemId: 1,
        tutorId: 4,
        tutorFirstName: 'Grace',
        tutorLastName: 'Hopper',
        offeringLabel: 'CBSE | Economics | Classes 11',
        createdDate: new Date('2026-08-01T00:00:00Z'),
      }),
      credit({
        orderItemId: 2,
        tutorId: 8,
        tutorFirstName: 'Alan',
        tutorLastName: 'Turing',
        offeringLabel: 'Mathematics',
        createdDate: new Date('2026-09-01T00:00:00Z'),
      }),
    ],
    now,
  );

  it('keeps every tutor and subject while filtering an exact match', () => {
    const page = pageStudentClassBookings(groups, {
      tutorId: 4,
      offeringLabel: 'CBSE | Economics | Classes 11',
      page: 1,
      pageSize: 20,
    });
    expect(page.items.map((item) => item.orderItemId)).toEqual([1]);
    expect(page.items[0]).toMatchObject({ tutorId: 4, tutorName: 'Grace Hopper' });
    expect(page.tutors).toEqual([
      { id: 8, name: 'Alan Turing' },
      { id: 4, name: 'Grace Hopper' },
    ]);
    expect(page.subjects).toEqual(['CBSE | Economics | Classes 11', 'Mathematics']);

    const miss = pageStudentClassBookings(groups, { offeringLabel: 'Economics' });
    expect(miss.items).toHaveLength(0);
    expect(miss.subjects).toHaveLength(2);
  });

  it('paginates student rows', () => {
    const page = pageStudentClassBookings(groups, { page: 2, pageSize: 1 });
    expect(page.totalCount).toBe(2);
    expect(page.totalPages).toBe(2);
    expect(page.items.map((item) => item.orderItemId)).toEqual([1]);
  });
});
