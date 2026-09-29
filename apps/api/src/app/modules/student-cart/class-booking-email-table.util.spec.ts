import { ClassSessionDeliveryModeEnum } from '../tutor-class-session/enums/class-session-delivery-mode.enum';
import {
  buildClassBookingTable,
  buildClassScheduleTable,
} from './class-booking-email-table.util';

describe('class booking email tables', () => {
  const line = {
    tutorName: 'Priya Sharma',
    offeringLabel: 'Class 7 Mathematics',
    deliveryMode: ClassSessionDeliveryModeEnum.offline,
    classCount: 4,
    lineAmountInr: 2000,
  };

  it('includes the amount on the student table', () => {
    const table = buildClassBookingTable([line], { includeAmount: true });

    expect(table.html).toContain('Priya Sharma');
    expect(table.html).toContain('Class 7 Mathematics');
    expect(table.html).toContain('Offline');
    expect(table.html).toContain('₹2,000');
    expect(table.text).toContain('Amount');
  });

  it('omits the amount on the tutor table', () => {
    const table = buildClassBookingTable([line], { includeAmount: false });

    expect(table.html).toContain('Class 7 Mathematics');
    expect(table.html).toContain('Offline');
    expect(table.html).not.toContain('Priya Sharma');
    expect(table.html).not.toContain('₹');
    expect(table.text).not.toContain('Amount');
  });

  it('renders a scheduled class as one row', () => {
    const table = buildClassScheduleTable({
      counterpartLabel: 'Tutor',
      counterpartName: 'Priya Sharma',
      offeringLabel: 'Class 7 Mathematics',
      deliveryMode: ClassSessionDeliveryModeEnum.online,
      classTime: 'Mon 18 Aug, 5:00–6:00 PM',
    });

    expect(table.html).toContain('Priya Sharma');
    expect(table.html).toContain('Online');
    expect(table.html).toContain('Mon 18 Aug, 5:00–6:00 PM');
  });
});