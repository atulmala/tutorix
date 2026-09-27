import { ClassSessionDeliveryModeEnum } from '../tutor-class-session/enums/class-session-delivery-mode.enum';
import { groupAdminClassBookingLines } from './admin-class-booking-group-lines.util';
import { ClassCreditStatusEnum } from './enums/class-credit-status.enum';

describe('groupAdminClassBookingLines', () => {
  it('merges credits for the same tutor, offering, and mode', () => {
    const result = groupAdminClassBookingLines([
      {
        tutorId: 3,
        tutorOfferingId: 10,
        tutorFirstName: 'Priya',
        tutorLastName: 'Sharma',
        offeringLabel: 'Mathematics',
        deliveryMode: ClassSessionDeliveryModeEnum.offline,
        status: ClassCreditStatusEnum.scheduled,
        unitRateInr: 500,
        orderItemPaidParts: {
          lineSubtotalInr: 1000,
          discountInr: 0,
          cgstInr: 90,
          sgstInr: 90,
          igstInr: 0,
          quantity: 2,
        },
      },
      {
        tutorId: 3,
        tutorOfferingId: 10,
        tutorFirstName: 'Priya',
        tutorLastName: 'Sharma',
        offeringLabel: 'Mathematics',
        deliveryMode: ClassSessionDeliveryModeEnum.offline,
        status: ClassCreditStatusEnum.unscheduled,
        unitRateInr: 500,
        orderItemPaidParts: {
          lineSubtotalInr: 1000,
          discountInr: 0,
          cgstInr: 90,
          sgstInr: 90,
          igstInr: 0,
          quantity: 2,
        },
      },
      {
        tutorId: 5,
        tutorOfferingId: 20,
        tutorFirstName: 'Raj',
        tutorLastName: 'Kumar',
        offeringLabel: 'English',
        deliveryMode: ClassSessionDeliveryModeEnum.online,
        status: ClassCreditStatusEnum.unscheduled,
        unitRateInr: 400,
        orderItemPaidParts: {
          lineSubtotalInr: 400,
          discountInr: 0,
          cgstInr: 36,
          sgstInr: 36,
          igstInr: 0,
          quantity: 1,
        },
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      tutorName: 'Priya Sharma',
      offeringLabel: 'Mathematics',
      classCount: 2,
      scheduledCount: 1,
      unscheduledCount: 1,
      cancelledCount: 0,
      unitRateInr: 500,
      linePaidInr: 1180,
    });
    expect(result[1]).toMatchObject({
      tutorName: 'Raj Kumar',
      classCount: 1,
    });
  });
});
