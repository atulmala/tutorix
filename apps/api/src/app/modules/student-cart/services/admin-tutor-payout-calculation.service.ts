import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  classEligibleForPayoutView,
  classEndedWithinUtcRange,
  computeTutorPayoutRow,
  formatIstCalendarDate,
  istDateRangeToUtcBounds,
  istDayStartUtc,
  istMonthBounds,
  addIstDaysUtc,
  parseIstCalendarDate,
  scheduledClassHasEnded,
  type IstDateRangeUtcBounds,
} from '@tutorix/shared-utils';
import { ClassPricingSettingsService } from '../../class-pricing-settings/services/class-pricing-settings.service';
import { OrderItemEntity } from '../../commerce/entities/order-item.entity';
import { PaymentGatewayProviderEnum } from '../../payment/enums/payment.enums';
import {
  PaymentGatewayFeePayoutConfig,
  PaymentGatewayFeeService,
} from '../../payment-gateway-fee/services/payment-gateway-fee.service';
import { PaymentDisbursementStatusEnum } from '../../payment-processing/enums/payment-disbursement-status.enum';
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
import { PostClassRefundAdminStatusEnum } from '../enums/post-class-refund-admin-status.enum';
import { TutorPayoutCreditBucketEnum } from '../enums/tutor-payout-credit-bucket.enum';

type RawPayoutCreditRow = {
  creditId: string;
  orderItemId: string;
  tutorId: string;
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
  tutorPayoutDisbursementId: string | null;
  linkedDisbursementStatus: PaymentDisbursementStatusEnum | null;
  claimAdminStatus: PostClassRefundAdminStatusEnum | null;
};

const CREDIT_SELECT = [
  'credit.id AS "creditId"',
  'credit.order_item_id AS "orderItemId"',
  'tutor.id AS "tutorId"',
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
  'credit.tutor_payout_disbursement_id AS "tutorPayoutDisbursementId"',
  'linkedDisbursement.status AS "linkedDisbursementStatus"',
  'claim.admin_status AS "claimAdminStatus"',
] as const;

const CARRY_FORWARD_RANGE_START = '2020-01-01';

export type TutorPayoutCalculateOptions = {
  tutorId?: number;
  now?: Date;
  includeAllRows?: boolean;
  settlementMode?: boolean;
  requireOutsideDisputeWindow?: boolean;
  restrictToBucket?: TutorPayoutCreditBucketEnum;
  viewYear?: number;
  viewMonth?: number;
};

export type AdminTutorPayoutCalculationWithMeta = AdminTutorPayoutCalculationResult & {
  creditIdsByTutorId: Map<number, number[]>;
};

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

function isActiveDisbursementLink(row: RawPayoutCreditRow): boolean {
  if (row.tutorPayoutDisbursementId == null || row.tutorPayoutDisbursementId === '') {
    return false;
  }
  const status = row.linkedDisbursementStatus;
  if (!status) {
    return true;
  }
  return (
    status !== PaymentDisbursementStatusEnum.cancelled &&
    status !== PaymentDisbursementStatusEnum.failed
  );
}

function hasActivePostClassDispute(row: RawPayoutCreditRow): boolean {
  const status = row.claimAdminStatus;
  if (!status) {
    return false;
  }
  return (
    status === PostClassRefundAdminStatusEnum.pending ||
    status === PostClassRefundAdminStatusEnum.approved
  );
}

type GroupBucket = {
  orderItemId: number;
  tutorId: number;
  tutorName: string;
  studentName: string;
  classesInBooking: number;
  rateInr: number;
  unitRateInr: number;
  deliveryMode: ClassSessionDeliveryModeEnum;
  concludedInRange: number;
  paymentGatewayProvider: PaymentGatewayProviderEnum;
  creditIds: number[];
};

@Injectable()
export class AdminTutorPayoutCalculationService {
  constructor(
    @InjectRepository(StudentClassCreditEntity)
    private readonly creditRepo: Repository<StudentClassCreditEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
    private readonly classPricingSettingsService: ClassPricingSettingsService,
    private readonly paymentGatewayFeeService: PaymentGatewayFeeService,
  ) {}

  async calculate(
    input: AdminTutorPayoutCalculationInput,
    options?: TutorPayoutCalculateOptions,
  ): Promise<AdminTutorPayoutCalculationResult> {
    return this.calculateWithMeta(input, {
      ...options,
      settlementMode: options?.settlementMode ?? input.settlementMode === true,
    });
  }

  async calculateWithMeta(
    input: AdminTutorPayoutCalculationInput,
    options?: TutorPayoutCalculateOptions,
  ): Promise<AdminTutorPayoutCalculationWithMeta> {
    const now = options?.now ?? new Date();
    const settlementMode = options?.settlementMode ?? input.settlementMode === true;
    const selectionBounds = istDateRangeToUtcBounds(input.startDate, input.endDate);
    if (!selectionBounds) {
      throw new BadRequestException('Invalid or inverted date range');
    }

    const viewMonthBounds =
      options?.viewYear != null && options?.viewMonth != null
        ? istMonthBounds(options.viewYear, options.viewMonth)
        : null;
    const viewMonthUtc =
      viewMonthBounds != null
        ? istDateRangeToUtcBounds(viewMonthBounds.startDate, viewMonthBounds.endDate)
        : null;
    const carryForwardBounds =
      viewMonthBounds != null && viewMonthUtc != null
        ? istDateRangeToUtcBounds(
            CARRY_FORWARD_RANGE_START,
            this.dayBeforeIstDate(viewMonthBounds.startDate),
          )
        : null;

    const page = Math.max(1, input.page ?? 1);
    const pageSize = options?.includeAllRows
      ? Math.max(1, input.pageSize ?? 10_000)
      : Math.min(100, Math.max(1, input.pageSize ?? 20));

    const qb = this.buildCreditQueryBuilder(input, options);
    const rows = await qb.select([...CREDIT_SELECT]).getRawMany<RawPayoutCreditRow>();

    const buckets = new Map<string, GroupBucket>();
    const creditIdsByTutorId = new Map<number, number[]>();

    for (const row of rows) {
      const durationMinutes =
        row.durationMinutes == null ? null : asNumber(row.durationMinutes, 60);
      if (!scheduledClassHasEnded(row.startsAt, durationMinutes, now)) {
        continue;
      }

      const bucket = this.resolveCreditBucket(row, durationMinutes, now, {
        selectionBounds,
        viewMonthUtc,
        carryForwardBounds,
        restrictToBucket: options?.restrictToBucket,
      });

      if (options?.restrictToBucket != null) {
        if (bucket !== options.restrictToBucket) {
          continue;
        }
      } else {
        const inSelectionRange = classEndedWithinUtcRange(
          row.startsAt,
          durationMinutes,
          selectionBounds,
          now,
        );
        if (!inSelectionRange) {
          continue;
        }
        if (settlementMode && (isActiveDisbursementLink(row) || hasActivePostClassDispute(row))) {
          continue;
        }
        if (
          settlementMode &&
          options?.requireOutsideDisputeWindow === true &&
          !classEligibleForPayoutView(row.startsAt, durationMinutes, now)
        ) {
          continue;
        }
      }

      const orderItemId = asNumber(row.orderItemId);
      const tutorId = asNumber(row.tutorId);
      const creditId = asNumber(row.creditId);
      const bucketKey = `${tutorId}:${orderItemId}`;
      const parts = paidPartsFromRow(row);

      let group = buckets.get(bucketKey);
      if (!group) {
        group = {
          orderItemId,
          tutorId,
          tutorName: personDisplayName(row.tutorFirstName, row.tutorLastName) || 'Tutor',
          studentName:
            personDisplayName(row.studentFirstName, row.studentLastName) || 'Student',
          classesInBooking: parts.quantity,
          rateInr: orderItemPaidInrPerCredit(parts),
          unitRateInr: asNumber(row.unitRateInr),
          deliveryMode: row.deliveryMode,
          concludedInRange: 0,
          paymentGatewayProvider: PaymentGatewayProviderEnum.razorpay,
          creditIds: [],
        };
        buckets.set(bucketKey, group);
      }
      group.concludedInRange += 1;
      group.creditIds.push(creditId);

      if (settlementMode) {
        const list = creditIdsByTutorId.get(tutorId) ?? [];
        list.push(creditId);
        creditIdsByTutorId.set(tutorId, list);
      }
    }

    const orderItemIds = [...new Set([...buckets.values()].map((b) => b.orderItemId))];
    const providerByOrderItemId =
      await this.loadPaymentGatewayProviderByOrderItemId(orderItemIds);
    for (const group of buckets.values()) {
      group.paymentGatewayProvider =
        providerByOrderItemId.get(group.orderItemId) ??
        PaymentGatewayProviderEnum.razorpay;
    }

    const settings = await this.classPricingSettingsService.getSettings();
    const gatewayConfig = await this.paymentGatewayFeeService.getPayoutConfig();
    const pricingSettings = {
      commissionSlabThresholdInr: settings.commissionSlabThresholdInr,
      tutorCommissionPercentUpToSlab: settings.tutorCommissionPercentUpToSlab,
      tutorCommissionPercentAboveSlab: settings.tutorCommissionPercentAboveSlab,
      platformFeePerParticipantInr: settings.platformFeePerParticipantInr,
    };

    const allRows = this.mapBucketsToRows(buckets, pricingSettings, gatewayConfig);
    return this.paginateResult(allRows, page, pageSize, creditIdsByTutorId);
  }

  async listEligibleCreditIdsForTutor(
    tutorId: number,
    startDate: string,
    endDate: string,
    now: Date = new Date(),
  ): Promise<number[]> {
    const result = await this.calculateWithMeta(
      {
        startDate,
        endDate,
        page: 1,
        pageSize: 10_000,
        settlementMode: true,
      },
      {
        tutorId,
        now,
        includeAllRows: true,
        settlementMode: true,
      },
    );
    return result.creditIdsByTutorId.get(tutorId) ?? [];
  }

  async stampCreditsForDisbursement(
    creditIds: number[],
    disbursementId: number,
  ): Promise<void> {
    if (creditIds.length === 0) {
      return;
    }
    await this.creditRepo.update({ id: In(creditIds) }, { tutorPayoutDisbursementId: disbursementId });
  }

  async clearCreditsLinkedToDisbursement(disbursementId: number): Promise<void> {
    await this.creditRepo.update(
      { tutorPayoutDisbursementId: disbursementId },
      { tutorPayoutDisbursementId: null },
    );
  }

  async totalsForTutorBucket(
    tutorId: number,
    year: number,
    month: number,
    bucket: TutorPayoutCreditBucketEnum,
    selection: { startDate: string; endDate: string },
    now: Date,
  ): Promise<{ concludedClassCount: number; totalNetPayoutInr: number }> {
    const monthBounds = istMonthBounds(year, month);
    if (!monthBounds) {
      return { concludedClassCount: 0, totalNetPayoutInr: 0 };
    }

    let range = selection;
    if (bucket === TutorPayoutCreditBucketEnum.carried_forward) {
      range = {
        startDate: CARRY_FORWARD_RANGE_START,
        endDate: this.dayBeforeIstDate(monthBounds.startDate),
      };
    }

    const settlementMode =
      bucket === TutorPayoutCreditBucketEnum.payable ||
      bucket === TutorPayoutCreditBucketEnum.carried_forward;

    const result = await this.calculateWithMeta(
      {
        startDate: range.startDate,
        endDate: range.endDate,
        page: 1,
        pageSize: 10_000,
        settlementMode,
      },
      {
        tutorId,
        now,
        includeAllRows: true,
        settlementMode,
        requireOutsideDisputeWindow:
          bucket === TutorPayoutCreditBucketEnum.payable ||
          bucket === TutorPayoutCreditBucketEnum.carried_forward,
        restrictToBucket: bucket,
        viewYear: year,
        viewMonth: month,
      },
    );
    const concludedClassCount = result.items.reduce((s, row) => s + row.concludedInRange, 0);
    return { concludedClassCount, totalNetPayoutInr: result.totalNetPayoutInr };
  }

  dayBeforeIstDate(isoDate: string): string {
    const parts = parseIstCalendarDate(isoDate);
    if (!parts) {
      return isoDate;
    }
    const dayStart = istDayStartUtc(parts.year, parts.month, parts.day);
    return formatIstCalendarDate(addIstDaysUtc(dayStart, -1));
  }

  private resolveCreditBucket(
    row: RawPayoutCreditRow,
    durationMinutes: number | null,
    now: Date,
    ctx: {
      selectionBounds: IstDateRangeUtcBounds;
      viewMonthUtc: IstDateRangeUtcBounds | null;
      carryForwardBounds: IstDateRangeUtcBounds | null;
      restrictToBucket?: TutorPayoutCreditBucketEnum;
    },
  ): TutorPayoutCreditBucketEnum | null {
    if (ctx.viewMonthUtc == null || ctx.restrictToBucket == null) {
      return TutorPayoutCreditBucketEnum.payable;
    }

    const endedInViewMonth = classEndedWithinUtcRange(
      row.startsAt,
      durationMinutes,
      ctx.viewMonthUtc,
      now,
    );
    const endedInCarryRange =
      ctx.carryForwardBounds != null &&
      classEndedWithinUtcRange(row.startsAt, durationMinutes, ctx.carryForwardBounds, now);

    if (hasActivePostClassDispute(row)) {
      if (endedInViewMonth || endedInCarryRange) {
        return TutorPayoutCreditBucketEnum.under_dispute;
      }
      return null;
    }

    if (isActiveDisbursementLink(row)) {
      return null;
    }

    if (endedInCarryRange && !endedInViewMonth) {
      if (classEligibleForPayoutView(row.startsAt, durationMinutes, now)) {
        return TutorPayoutCreditBucketEnum.carried_forward;
      }
      return null;
    }

    if (endedInViewMonth) {
      if (!classEndedWithinUtcRange(row.startsAt, durationMinutes, ctx.selectionBounds, now)) {
        return null;
      }
      if (!classEligibleForPayoutView(row.startsAt, durationMinutes, now)) {
        return TutorPayoutCreditBucketEnum.in_dispute_window;
      }
      return TutorPayoutCreditBucketEnum.payable;
    }

    return null;
  }

  private buildCreditQueryBuilder(
    input: AdminTutorPayoutCalculationInput,
    options?: TutorPayoutCalculateOptions,
  ) {
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
      .leftJoin(
        'payment_disbursement',
        'linkedDisbursement',
        'linkedDisbursement.id = credit.tutor_payout_disbursement_id AND linkedDisbursement.deleted = false',
      )
      .leftJoin(
        'post_class_refund_claim',
        'claim',
        'claim.enrollment_id = credit.enrollment_id AND claim.deleted = false',
      )
      .where('credit.deleted = false')
      .andWhere('credit.status = :scheduled', { scheduled: ClassCreditStatusEnum.scheduled })
      .andWhere('credit.is_demo = false')
      .andWhere('calendar.starts_at IS NOT NULL');

    if (options?.tutorId != null) {
      qb.andWhere('tutor.id = :tutorId', { tutorId: options.tutorId });
    } else {
      applyAdminClassBookingTutorSearch(qb, input.tutorSearch);
    }

    return qb;
  }

  private mapBucketsToRows(
    buckets: Map<string, GroupBucket>,
    pricingSettings: {
      commissionSlabThresholdInr: number;
      tutorCommissionPercentUpToSlab: number;
      tutorCommissionPercentAboveSlab: number;
      platformFeePerParticipantInr: number;
    },
    gatewayConfig: PaymentGatewayFeePayoutConfig,
  ): AdminTutorPayoutCalculationRow[] {
    return [...buckets.values()]
      .map((group) => {
        const deliveryMode =
          group.deliveryMode === ClassSessionDeliveryModeEnum.online ? 'online' : 'offline';
        const chargePercent = this.paymentGatewayFeeService.resolveChargePercent(
          group.paymentGatewayProvider,
          gatewayConfig,
        );
        const amounts = computeTutorPayoutRow({
          rateInr: group.rateInr,
          unitRateInr: group.unitRateInr,
          concludedInRange: group.concludedInRange,
          deliveryMode,
          settings: pricingSettings,
          paymentGateway: {
            chargePercent,
            gstRatePercent: gatewayConfig.gstRatePercent,
          },
        });
        return {
          orderItemId: group.orderItemId,
          tutorId: group.tutorId,
          tutorName: group.tutorName,
          studentName: group.studentName,
          classesInBooking: group.classesInBooking,
          rateInr: group.rateInr,
          concludedInRange: group.concludedInRange,
          grossInr: amounts.grossInr,
          commissionPercent: amounts.commissionPercent,
          commissionInr: amounts.commissionInr,
          onlineChargesInr: amounts.onlineChargesInr,
          paymentGatewayProvider: group.paymentGatewayProvider,
          paymentGatewayFeeInr: amounts.paymentGatewayFeeInr,
          paymentGatewayGstInr: amounts.paymentGatewayGstInr,
          paymentGatewayChargesInr: amounts.paymentGatewayChargesInr,
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
  }

  private paginateResult(
    allRows: AdminTutorPayoutCalculationRow[],
    page: number,
    pageSize: number,
    creditIdsByTutorId: Map<number, number[]>,
  ): AdminTutorPayoutCalculationWithMeta {
    let totalGrossInr = 0;
    let totalCommissionInr = 0;
    let totalOnlineChargesInr = 0;
    let totalPaymentGatewayFeeInr = 0;
    let totalPaymentGatewayGstInr = 0;
    let totalPaymentGatewayChargesInr = 0;
    let totalDeductionsInr = 0;
    let totalNetPayoutInr = 0;
    for (const row of allRows) {
      totalGrossInr += row.grossInr;
      totalCommissionInr += row.commissionInr;
      totalOnlineChargesInr += row.onlineChargesInr;
      totalPaymentGatewayFeeInr += row.paymentGatewayFeeInr;
      totalPaymentGatewayGstInr += row.paymentGatewayGstInr;
      totalPaymentGatewayChargesInr += row.paymentGatewayChargesInr;
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
      totalPaymentGatewayFeeInr,
      totalPaymentGatewayGstInr,
      totalPaymentGatewayChargesInr,
      totalDeductionsInr,
      totalNetPayoutInr,
      creditIdsByTutorId,
    };
  }

  private async loadPaymentGatewayProviderByOrderItemId(
    orderItemIds: number[],
  ): Promise<Map<number, PaymentGatewayProviderEnum>> {
    const map = new Map<number, PaymentGatewayProviderEnum>();
    if (orderItemIds.length === 0) {
      return map;
    }
    const rows: { orderItemId: string; provider: PaymentGatewayProviderEnum | null }[] =
      await this.orderItemRepo.manager.query(
        `
        SELECT oi.id AS "orderItemId", latest.provider AS provider
        FROM commerce_order_item oi
        LEFT JOIN LATERAL (
          SELECT pa.provider
          FROM commerce_payment_attempt pa
          WHERE pa.order_id = oi.order_id
            AND pa.status = 'paid'
            AND pa.deleted = false
          ORDER BY pa.id DESC
          LIMIT 1
        ) latest ON true
        WHERE oi.id = ANY($1::int[])
        `,
        [orderItemIds],
      );
    for (const row of rows) {
      const orderItemId = Number(row.orderItemId);
      if (!Number.isFinite(orderItemId)) {
        continue;
      }
      if (row.provider) {
        map.set(orderItemId, row.provider);
      }
    }
    return map;
  }
}