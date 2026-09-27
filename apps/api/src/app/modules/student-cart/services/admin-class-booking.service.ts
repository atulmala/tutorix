import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  applyAdminClassBookingStudentSearch,
  applyAdminClassBookingTutorSearch,
  personDisplayName,
} from '../admin-class-booking.utils';
import { groupAdminClassBookingLines } from '../admin-class-booking-group-lines.util';
import { AdminClassBookingCheckoutItem } from '../dto/admin/admin-class-booking-checkout-item.dto';
import { AdminClassBookingGroupedLine } from '../dto/admin/admin-class-booking-grouped-line.dto';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { AdminClassBookingListInput } from '../dto/admin/admin-class-booking-list.input';
import { AdminClassBookingListResult } from '../dto/admin/admin-class-booking-list-result.dto';
import { StudentClassCreditEntity } from '../entities/student-class-credit.entity';

type RawClassBookingRow = {
  id: string;
  studentId: string;
  studentFirstName: string | null;
  studentLastName: string | null;
  studentEmail: string | null;
  tutorId: string;
  tutorOfferingId: string;
  tutorFirstName: string | null;
  tutorLastName: string | null;
  offeringLabel: string | null;
  deliveryMode: ClassSessionDeliveryModeEnum;
  status: ClassCreditStatusEnum;
  startsAt: Date | null;
  orderId: string;
  orderNumber: string;
  amountDueInr: string;
  amountPaidInr: string;
  unitRateInr: string;
  orderItemQuantity: string;
  lineSubtotalInr: string;
  orderItemDiscountInr: string;
  orderItemCgstInr: string;
  orderItemSgstInr: string;
  orderItemIgstInr: string;
  createdDate: Date;
};

const CREDIT_SELECT = [
  'credit.id AS id',
  'credit.student_id AS "studentId"',
  'studentUser.firstName AS "studentFirstName"',
  'studentUser.lastName AS "studentLastName"',
  'studentUser.email AS "studentEmail"',
  'credit.tutor_id AS "tutorId"',
  'credit.tutor_offering_id AS "tutorOfferingId"',
  'tutorUser.firstName AS "tutorFirstName"',
  'tutorUser.lastName AS "tutorLastName"',
  'offering.display_name AS "offeringLabel"',
  'credit.delivery_mode AS "deliveryMode"',
  'credit.status AS status',
  'calendar.starts_at AS "startsAt"',
  'credit.order_id AS "orderId"',
  'order.order_number AS "orderNumber"',
  'order.amount_due_inr AS "amountDueInr"',
  'order.amount_paid_inr AS "amountPaidInr"',
  'orderItem.unit_rate_inr AS "unitRateInr"',
  'orderItem.quantity AS "orderItemQuantity"',
  'orderItem.line_subtotal_inr AS "lineSubtotalInr"',
  'orderItem.discount_inr AS "orderItemDiscountInr"',
  'orderItem.cgst_inr AS "orderItemCgstInr"',
  'orderItem.sgst_inr AS "orderItemSgstInr"',
  'orderItem.igst_inr AS "orderItemIgstInr"',
  'credit.createdDate AS "createdDate"',
] as const;

@Injectable()
export class AdminClassBookingService {
  constructor(
    @InjectRepository(StudentClassCreditEntity)
    private readonly creditRepo: Repository<StudentClassCreditEntity>,
  ) {}

  async list(input: AdminClassBookingListInput): Promise<AdminClassBookingListResult> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;

    const filteredQb = this.createCreditQueryBuilder();
    this.applyListFilters(filteredQb, input);

    const countRow = await filteredQb
      .clone()
      .select('COUNT(DISTINCT credit.order_id)', 'cnt')
      .getRawOne<{ cnt: string }>();
    const totalCount = Number(countRow?.cnt ?? 0);

    const orderPage = await filteredQb
      .clone()
      .select('credit.order_id', 'orderId')
      .addSelect('MAX(credit.createdDate)', 'purchasedAt')
      .groupBy('credit.order_id')
      .orderBy('MAX(credit.createdDate)', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<{ orderId: string; purchasedAt: Date }>();

    const orderIds = orderPage.map((row) => Number(row.orderId));

    if (orderIds.length === 0) {
      return {
        items: [],
        totalCount,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      };
    }

    const linesQb = this.createCreditQueryBuilder();
    linesQb.andWhere('credit.order_id IN (:...orderIds)', { orderIds });

    const lineRows = await linesQb
      .select([...CREDIT_SELECT])
      .orderBy('credit.createdDate', 'ASC')
      .addOrderBy('credit.id', 'ASC')
      .getRawMany<RawClassBookingRow>();

    const rowsByOrderId = new Map<number, RawClassBookingRow[]>();
    for (const row of lineRows) {
      const orderId = Number(row.orderId);
      const bucket = rowsByOrderId.get(orderId) ?? [];
      bucket.push(row);
      rowsByOrderId.set(orderId, bucket);
    }

    const items: AdminClassBookingCheckoutItem[] = orderPage.map((orderRow) => {
      const orderId = Number(orderRow.orderId);
      const rows = rowsByOrderId.get(orderId) ?? [];
      const first = rows[0];
      const tutorIds = new Set(rows.map((r) => Number(r.tutorId)));

      const lines: AdminClassBookingGroupedLine[] = groupAdminClassBookingLines(
        rows.map((row) => ({
          tutorId: Number(row.tutorId),
          tutorOfferingId: Number(row.tutorOfferingId),
          tutorFirstName: row.tutorFirstName,
          tutorLastName: row.tutorLastName,
          offeringLabel: row.offeringLabel ?? 'Class',
          deliveryMode: row.deliveryMode,
          status: row.status,
          unitRateInr: Number(row.unitRateInr ?? 0),
          orderItemPaidParts: {
            lineSubtotalInr: Number(row.lineSubtotalInr ?? 0),
            discountInr: Number(row.orderItemDiscountInr ?? 0),
            cgstInr: Number(row.orderItemCgstInr ?? 0),
            sgstInr: Number(row.orderItemSgstInr ?? 0),
            igstInr: Number(row.orderItemIgstInr ?? 0),
            quantity: Number(row.orderItemQuantity ?? 1),
          },
        })),
      );

      return {
        orderId,
        orderNumber: first?.orderNumber ?? '',
        studentId: Number(first?.studentId ?? 0),
        studentName:
          personDisplayName(first?.studentFirstName ?? null, first?.studentLastName ?? null) ||
          'Student',
        studentEmail: first?.studentEmail ?? undefined,
        purchasedAt: orderRow.purchasedAt,
        classCount: rows.length,
        tutorCount: tutorIds.size,
        amountDueInr: Number(first?.amountDueInr ?? 0),
        amountPaidInr: Number(first?.amountPaidInr ?? 0),
        lines,
      };
    });

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  }

  private createCreditQueryBuilder(): SelectQueryBuilder<StudentClassCreditEntity> {
    return this.creditRepo
      .createQueryBuilder('credit')
      .innerJoin('credit.student', 'student')
      .innerJoin('student.user', 'studentUser')
      .innerJoin('credit.tutor', 'tutor')
      .innerJoin('tutor.user', 'tutorUser')
      .innerJoin('credit.tutorOffering', 'tutorOffering')
      .innerJoin('tutorOffering.offering', 'offering')
      .innerJoin('credit.order', 'order')
      .innerJoin('credit.orderItem', 'orderItem')
      .leftJoin('credit.enrollment', 'enrollment')
      .leftJoin('enrollment.session', 'session')
      .leftJoin('session.tutorCalendar', 'calendar')
      .where('credit.deleted = false');
  }

  private applyListFilters(
    qb: SelectQueryBuilder<StudentClassCreditEntity>,
    input: AdminClassBookingListInput,
  ): void {
    applyAdminClassBookingStudentSearch(qb, input.studentSearch);
    applyAdminClassBookingTutorSearch(qb, input.tutorSearch);

    if (input.status) {
      qb.andWhere('credit.status = :status', { status: input.status });
    }
  }
}
