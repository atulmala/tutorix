import { ClassSessionDeliveryModeEnum } from '../tutor-class-session/enums/class-session-delivery-mode.enum';
import { AdminClassBookingGroupedLine } from './dto/admin/admin-class-booking-grouped-line.dto';
import { ClassCreditStatusEnum } from './enums/class-credit-status.enum';
import { orderItemPaidInrPerCredit } from './admin-class-booking-order-item.util';
import { personDisplayName } from './admin-class-booking.utils';

export type AdminClassBookingGroupLineSource = {
  tutorId: number;
  tutorOfferingId: number;
  tutorFirstName: string | null;
  tutorLastName: string | null;
  offeringLabel: string;
  deliveryMode: ClassSessionDeliveryModeEnum;
  status: ClassCreditStatusEnum;
  unitRateInr: number;
  orderItemPaidParts: {
    lineSubtotalInr: number;
    discountInr: number;
    cgstInr: number;
    sgstInr: number;
    igstInr: number;
    quantity: number;
  };
};

type GroupAccumulator = AdminClassBookingGroupedLine & {
  unitRateInrTotal: number;
};

function groupKey(row: AdminClassBookingGroupLineSource): string {
  return `${row.tutorId}:${row.tutorOfferingId}:${row.deliveryMode}`;
}

export function groupAdminClassBookingLines(
  sources: AdminClassBookingGroupLineSource[],
): AdminClassBookingGroupedLine[] {
  const buckets = new Map<string, GroupAccumulator>();

  for (const row of sources) {
    const key = groupKey(row);
    let group = buckets.get(key);
    if (!group) {
      group = {
        tutorId: row.tutorId,
        tutorName: personDisplayName(row.tutorFirstName, row.tutorLastName) || 'Tutor',
        offeringLabel: row.offeringLabel,
        deliveryMode: row.deliveryMode,
        classCount: 0,
        scheduledCount: 0,
        unscheduledCount: 0,
        cancelledCount: 0,
        unitRateInr: 0,
        linePaidInr: 0,
        unitRateInrTotal: 0,
      };
      buckets.set(key, group);
    }

    group.classCount += 1;
    group.unitRateInrTotal += row.unitRateInr;
    group.linePaidInr += orderItemPaidInrPerCredit(row.orderItemPaidParts);
    if (row.status === ClassCreditStatusEnum.scheduled) {
      group.scheduledCount += 1;
    } else if (row.status === ClassCreditStatusEnum.unscheduled) {
      group.unscheduledCount += 1;
    } else {
      group.cancelledCount += 1;
    }
  }

  return [...buckets.values()].map((group) => ({
    tutorId: group.tutorId,
    tutorName: group.tutorName,
    offeringLabel: group.offeringLabel,
    deliveryMode: group.deliveryMode,
    classCount: group.classCount,
    scheduledCount: group.scheduledCount,
    unscheduledCount: group.unscheduledCount,
    cancelledCount: group.cancelledCount,
    unitRateInr: Math.round(group.unitRateInrTotal / group.classCount),
    linePaidInr: group.linePaidInr,
  })).sort((a, b) => {
    const byTutor = a.tutorName.localeCompare(b.tutorName);
    if (byTutor !== 0) {
      return byTutor;
    }
    const byOffering = a.offeringLabel.localeCompare(b.offeringLabel);
    if (byOffering !== 0) {
      return byOffering;
    }
    return a.deliveryMode.localeCompare(b.deliveryMode);
  });
}
