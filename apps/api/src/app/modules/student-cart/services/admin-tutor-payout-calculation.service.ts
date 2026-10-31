import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  classEndedWithinUtcRange,
  computeTutorPayoutRow,
  istDateRangeToUtcBounds,
  scheduledClassHasEnded,
} from '@tutorix/shared-utils';
import { ClassPricingSettingsService } from '../../class-pricing-settings/services/class-pricing-settings.service';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import {
  applyAdminClassBookingTutorSearch,
  personDisplayName,
} from '../admin-class-booking.utils';
import {
  orderItemPaidInrPerCredit,
  OrderItemPaidParts,
} from '../admin-class-booking-order-item.util';
import { AdminTutorPayoutCalculationInput } from '../dto/admin/admin-tutor-payout-calculation.input';
import {
  AdminTutorPayoutCalculationResult,
  AdminTutorPayoutCalculationRow,
} from '../dto/admin/admin-tutor-payout-calculation-result.dto';
import { StudentClassCreditEntity } from '../entities/student-class-credit.entity';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';

type RawPayoutCreditRow = {
  orderItemId: string;
  studentFirstName: string | null;
  studentLastName: string | null;
  tutorFirstName: string | null;
  tutorLastName: string | null;
  deliveryMode: ClassSessionDeliveryModeEnum;
  startsAt: Date | null;
  durationMinutes: string | number | null;
  unitRateInr: string | null;
  orderItemQuantity: string | null;
  lineSubtotalInr: string | null;
  orderItemDiscountInr: string | null;
  orderItemCgstInr: string | null;
  orderItemSgstInr: string | null;
  orderItemIgstInr: string | null;
};

const CREDIT_SELECT = [
  'credit.order_item_id AS "orderItemId"',
  'studentUser.firstName AS "studentFirstName"',
  'studentUser.lastName AS "studentLastName"',
  'tutorUser.firstName AS "tutorFirstName"',
  'tutorUser.lastName AS "tutorLastName"',
  'credit.delivery_mode AS "deliveryMode"',
  'calendar.starts_at AS "startsAt"',
  'calendar.duration_minutes AS "durationMinutes"',
  'orderItem.unit_rate_inr AS "unitRateInr"',
  'orderItem.quantity AS "orderItemQuantity"',
  'orderItem.line_subtotal_inr AS "lineSubtotalInr"',
  'orderItem.discount_inr AS "orderItemDiscountInr"',
  'orderItem.cgst_inr AS "orderItemCgstInr"',
  'orderItem.sgst_inr AS "orderItemSgstInr"',
  'orderItem.igst_inr AS "orderItemIgstInr"',
] as const;

function asNumber(value: string | number | null | undefined, fallback = 0): number {
  if (value == null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function paidPartsFromRow(row: RawPayoutCreditRow): OrderItemPaidParts {
  return {
    lineSubtotalInr: asNumber(row.lineSubtotalInr),
    discountInr: asNumber(row.orderItemDiscountInr),
    cgstInr: asNumber(row.orderItemCgstInr),
    sgstInr: asNumber(row.orderItemSgstInr),
    igstInr: asNumber(row.orderItemIgstInr),
    quantity: Math.max(1, asNumber(row.orderItemQuantity, 1)),
  };
}

type GroupBucket = {
  orderItemId: number;
  tutorName: string;
  studentName: string;
  classesInBooking: number;
  rateInr: number;
  unitRateInr: number;
  deliveryMode: ClassSessionDeliveryModeEnum;
  concludedInRange: number;
};

@Injectable()
export class AdminTutorPayoutCalculationService {
  constructor(
    @InjectRepository(StudentClassCreditEntity)
    private readonly creditRepo: Repository<StudentClassCreditEntity>,
    private readonly classPricingSettingsService: ClassPricingSettingsService,
  ) {}

  async calculate(
    input: AdminTutorPayoutCalculationInput,
    now: Date = new Date(),
  ): Promise<AdminTutorPayoutCalculationResult> {
    const bounds = istDateRangeToUtcBounds(input.startDate, input.endDate);
    if (!bounds) {
      throw new BadRequestException('Invalid or inverted date range');
    }

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));

    const qb = this.creditRepo
      .createQueryBuilder('credit')
      .innerJoin('credit.student', 'student')
      .innerJoin('student.user', 'studentUser')
      .innerJoin('credit.tutor', 'tutor')
      .innerJoin('tutor.user', 'tutorUser')
      .innerJoin('credit.orderItem', 'orderItem')
      .innerJoin('credit.enrollment', 'enrollment')
      .innerJoin('enrollment.session', 'session')
      .innerJoin('session.tutorCalendar', 'calendar')
      .where('credit.deleted = false')
      .andWhere('credit.status = :scheduled', { scheduled: ClassCreditStatusEnum.scheduled })
      .andWhere('credit.is_demo = false')
      .andWhere('calendar.starts_at IS NOT NULL');

    applyAdminClassBookingTutorSearch(qb, input.tutorSearch);

    const rows = await qb.select([...CREDIT_SELECT]).getRawMany<RawPayoutCreditRow>();

    const buckets = new Map<number, GroupBucket>();

    for (const row of rows) {
      const durationMinutes =
        row.durationMinutes == null ? null : asNumber(row.durationMinutes, 60);
      if (
        !scheduledClassHasEnded(row.startsAt, durationMinutes, now) ||
        !classEndedWithinUtcRange(row.startsAt, durationMinutes, bounds, now)
      ) {
        continue;
      }

      const orderItemId = asNumber(row.orderItemId);
      const parts = paidPartsFromRow(row);
      let bucket = buckets.get(orderItemId);
      if (!bucket) {
        bucket = {
          orderItemId,
          tutorName: personDisplayName(row.tutorFirstName, row.tutorLastName) || 'Tutor',
          studentName:
            personDisplayName(row.studentFirstName, row.studentLastName) || 'Student',
          classesInBooking: parts.quantity,
          rateInr: orderItemPaidInrPerCredit(parts),
          unitRateInr: asNumber(row.unitRateInr),
          deliveryMode: row.deliveryMode,
          concludedInRange: 0,
        };
        buckets.set(orderItemId, bucket);
      }
      bucket.concludedInRange += 1;
    }

    const settings = await this.classPricingSettingsService.getSettings();
    const pricingSettings = {
      commissionSlabThresholdInr: settings.commissionSlabThresholdInr,
      tutorCommissionPercentUpToSlab: settings.tutorCommissionPercentUpToSlab,
      tutorCommissionPercentAboveSlab: settings.tutorCommissionPercentAboveSlab,
      platformFeePerParticipantInr: settings.platformFeePerParticipantInr,
    };

    const allRows: AdminTutorPayoutCalculationRow[] = [...buckets.values()]
      .map((group) => {
        const deliveryMode =
          group.deliveryMode === ClassSessionDeliveryModeEnum.online ? 'online' : 'offline';
        const amounts = computeTutorPayoutRow({
          rateInr: group.rateInr,
          unitRateInr: group.unitRateInr,
          concludedInRange: group.concludedInRange,
          deliveryMode,
          settings: pricingSettings,
        });
        return {
          orderItemId: group.orderItemId,
          tutorName: group.tutorName,
          studentName: group.studentName,
          classesInBooking: group.classesInBooking,
          rateInr: group.rateInr,
          concludedInRange: group.concludedInRange,
          grossInr: amounts.grossInr,
          commissionPercent: amounts.commissionPercent,
          commissionInr: amounts.commissionInr,
          onlineChargesInr: amounts.onlineChargesInr,
          totalDeductionsInr: amounts.totalDeductionsInr,
          netPayoutInr: amounts.netPayoutInr,
        };
      })
      .sort((a, b) => {
        const byTutor = a.tutorName.localeCompare(b.tutorName);
        if (byTutor !== 0) {
          return byTutor;
        }
        const byStudent = a.studentName.localeCompare(b.studentName);
        if (byStudent !== 0) {
          return byStudent;
        }
        return a.orderItemId - b.orderItemId;
      });

    let totalGrossInr = 0;
    let totalCommissionInr = 0;
    let totalOnlineChargesInr = 0;
    let totalDeductionsInr = 0;
    let totalNetPayoutInr = 0;
    for (const row of allRows) {
      totalGrossInr += row.grossInr;
      totalCommissionInr += row.commissionInr;
      totalOnlineChargesInr += row.onlineChargesInr;
      totalDeductionsInr += row.totalDeductionsInr;
      totalNetPayoutInr += row.netPayoutInr;
    }

    const totalCount = allRows.length;
    const start = (page - 1) * pageSize;
    const items = allRows.slice(start, start + pageSize);

    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      totalGrossInr,
      totalCommissionInr,
      totalOnlineChargesInr,
      totalDeductionsInr,
      totalNetPayoutInr,
    };
  }
}
