import { scheduledClassHasEnded } from '@tutorix/shared-utils';
import { ClassSessionDeliveryModeEnum } from '../tutor-class-session/enums/class-session-delivery-mode.enum';
import { personDisplayName } from './admin-class-booking.utils';
import { orderItemPaidInrPerCredit, OrderItemPaidParts } from './admin-class-booking-order-item.util';
import { TutorClassBookingListResult, TutorClassBookingRow } from './dto/tutor-class-booking.dto';
import { ClassCreditStatusEnum } from './enums/class-credit-status.enum';
import {
  TutorBookingConclusionStatus,
  TutorBookingSchedulingStatus,
} from './enums/tutor-booking-status.enum';

type SearchQb = {
  andWhere: (clause: string, params: Record<string, string>) => void;
};

export type TutorClassBookingCreditSource = {
  orderItemId: number;
  studentFirstName: string | null;
  studentLastName: string | null;
  tutorId?: number;
  tutorFirstName?: string | null;
  tutorLastName?: string | null;
  offeringLabel: string;
  deliveryMode: ClassSessionDeliveryModeEnum;
  status: ClassCreditStatusEnum;
  startsAt: Date | string | null;
  durationMinutes: number | null;
  orderItemPaidParts: OrderItemPaidParts;
  createdDate: Date;
  isDemo: boolean;
};

export type ClassBookingGroup = TutorClassBookingRow & {
  tutorId: number;
  tutorName: string;
};

type GroupAccumulator = {
  orderItemId: number;
  bookedAt: Date;
  studentName: string;
  tutorId: number;
  tutorName: string;
  offeringLabel: string;
  deliveryMode: ClassSessionDeliveryModeEnum;
  classCount: number;
  scheduledCount: number;
  unscheduledCount: number;
  cancelledCount: number;
  concludedCount: number;
  linePaidInr: number;
  demoCount: number;
};

export function applyTutorClassBookingStudentSearch(
  qb: SearchQb,
  search: string | undefined,
): void {
  const trimmed = search?.trim();
  if (!trimmed) {
    return;
  }
  qb.andWhere(
    `(
      studentUser.email ILIKE :studentSearchTerm
      OR studentUser.mobile ILIKE :studentSearchTerm
      OR studentUser.mobile_number ILIKE :studentSearchTerm
    )`,
    { studentSearchTerm: `%${trimmed}%` },
  );
}

function normalizeOfferingSearchText(value: string): string {
  return value.toLowerCase().replace(/\bclasses\b/g, 'class');
}

export function offeringLabelMatchesSearch(
  label: string,
  search: string | undefined,
): boolean {
  const trimmed = search?.trim();
  if (!trimmed) {
    return true;
  }
  return normalizeOfferingSearchText(label).includes(normalizeOfferingSearchText(trimmed));
}

export function deriveTutorBookingSchedulingStatus(counts: {
  classCount: number;
  scheduledCount: number;
  unscheduledCount: number;
  cancelledCount: number;
}): TutorBookingSchedulingStatus {
  if (counts.classCount > 0 && counts.cancelledCount === counts.classCount) {
    return TutorBookingSchedulingStatus.cancelled;
  }
  if (counts.scheduledCount > 0 && counts.unscheduledCount > 0) {
    return TutorBookingSchedulingStatus.partial;
  }
  if (counts.scheduledCount > 0) {
    return TutorBookingSchedulingStatus.scheduled;
  }
  return TutorBookingSchedulingStatus.unscheduled;
}

export function deriveTutorBookingConclusionStatus(counts: {
  scheduledCount: number;
  unscheduledCount: number;
  concludedCount: number;
}): TutorBookingConclusionStatus | null {
  const nonCancelled = counts.scheduledCount + counts.unscheduledCount;
  if (nonCancelled === 0) {
    return null;
  }
  if (counts.concludedCount === 0) {
    return TutorBookingConclusionStatus.not_concluded;
  }
  if (counts.concludedCount === nonCancelled) {
    return TutorBookingConclusionStatus.concluded;
  }
  return TutorBookingConclusionStatus.partial;
}

export function groupTutorClassBookings(
  sources: TutorClassBookingCreditSource[],
  now: Date = new Date(),
): ClassBookingGroup[] {
  const buckets = new Map<number, GroupAccumulator>();

  for (const row of sources) {
    let group = buckets.get(row.orderItemId);
    if (!group) {
      group = {
        orderItemId: row.orderItemId,
        bookedAt: row.createdDate,
        studentName:
          personDisplayName(row.studentFirstName, row.studentLastName) || 'Student',
        tutorId: row.tutorId ?? 0,
        tutorName: personDisplayName(row.tutorFirstName, row.tutorLastName) || 'Tutor',
        offeringLabel: row.offeringLabel || 'Class',
        deliveryMode: row.deliveryMode,
        classCount: 0,
        scheduledCount: 0,
        unscheduledCount: 0,
        cancelledCount: 0,
        concludedCount: 0,
        linePaidInr: 0,
        demoCount: 0,
      };
      buckets.set(row.orderItemId, group);
    }

    if (row.createdDate < group.bookedAt) {
      group.bookedAt = row.createdDate;
    }
    group.classCount += 1;
    group.linePaidInr += orderItemPaidInrPerCredit(row.orderItemPaidParts);
    if (row.isDemo) {
      group.demoCount += 1;
    }
    if (row.status === ClassCreditStatusEnum.scheduled) {
      group.scheduledCount += 1;
      if (scheduledClassHasEnded(row.startsAt, row.durationMinutes, now)) {
        group.concludedCount += 1;
      }
    } else if (row.status === ClassCreditStatusEnum.unscheduled) {
      group.unscheduledCount += 1;
    } else {
      group.cancelledCount += 1;
    }
  }

  return [...buckets.values()]
    .map((group) => ({
      orderItemId: group.orderItemId,
      bookedAt: group.bookedAt,
      studentName: group.studentName,
      tutorId: group.tutorId,
      tutorName: group.tutorName,
      offeringLabel: group.offeringLabel,
      classCount: group.classCount,
      deliveryMode: group.deliveryMode,
      schedulingStatus: deriveTutorBookingSchedulingStatus(group),
      conclusionStatus: deriveTutorBookingConclusionStatus(group),
      scheduledCount: group.scheduledCount,
      unscheduledCount: group.unscheduledCount,
      cancelledCount: group.cancelledCount,
      concludedCount: group.concludedCount,
      linePaidInr: group.demoCount === group.classCount ? 0 : group.linePaidInr,
      isDemo: group.demoCount === group.classCount && group.classCount > 0,
    }))
    .sort((a, b) => {
      const byDate = b.bookedAt.getTime() - a.bookedAt.getTime();
      if (byDate !== 0) {
        return byDate;
      }
      return b.orderItemId - a.orderItemId;
    });
}

export function pageTutorClassBookings(
  groups: TutorClassBookingRow[],
  input: {
    schedulingStatus?: TutorBookingSchedulingStatus | null;
    conclusionStatus?: TutorBookingConclusionStatus | null;
    page?: number;
    pageSize?: number;
  },
): TutorClassBookingListResult {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(20, Math.max(1, input.pageSize ?? 20));
  const filtered = groups.filter((group) => {
    if (input.schedulingStatus && group.schedulingStatus !== input.schedulingStatus) {
      return false;
    }
    if (input.conclusionStatus && group.conclusionStatus !== input.conclusionStatus) {
      return false;
    }
    return true;
  });
  const totalCount = filtered.length;
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export function studentBookingFilterOptions(groups: ClassBookingGroup[]): {
  tutors: { id: number; name: string }[];
  subjects: string[];
} {
  const tutors = new Map<number, string>();
  const subjects = new Set<string>();
  for (const group of groups) {
    if (group.tutorId > 0) {
      tutors.set(group.tutorId, group.tutorName);
    }
    if (group.offeringLabel) {
      subjects.add(group.offeringLabel);
    }
  }
  return {
    tutors: [...tutors.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id),
    subjects: [...subjects].sort((a, b) => a.localeCompare(b)),
  };
}

export function pageStudentClassBookings(
  groups: ClassBookingGroup[],
  input: {
    tutorId?: number | null;
    offeringLabel?: string | null;
    page?: number;
    pageSize?: number;
  },
): {
  items: ClassBookingGroup[];
  tutors: { id: number; name: string }[];
  subjects: string[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(20, Math.max(1, input.pageSize ?? 20));
  const offeringLabel = input.offeringLabel?.trim();
  const filtered = groups.filter((group) => {
    if (input.tutorId && group.tutorId !== input.tutorId) {
      return false;
    }
    if (offeringLabel && group.offeringLabel !== offeringLabel) {
      return false;
    }
    return true;
  });
  const totalCount = filtered.length;
  const start = (page - 1) * pageSize;
  return {
    ...studentBookingFilterOptions(groups),
    items: filtered.slice(start, start + pageSize),
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}
