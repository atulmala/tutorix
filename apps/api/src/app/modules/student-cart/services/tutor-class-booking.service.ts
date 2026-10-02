import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { OfferingService } from '../../offerings/services/offering.service';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { TutorClassBookingListResult } from '../dto/tutor-class-booking.dto';
import { TutorClassBookingListInput } from '../dto/tutor-class-booking-list.input';
import { StudentClassCreditEntity } from '../entities/student-class-credit.entity';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';
import {
  offeringsByIdFromCatalog,
  resolveStudentCartOfferingDisplay,
} from '../student-cart-offering-display.util';
import {
  applyTutorClassBookingStudentSearch,
  groupTutorClassBookings,
  offeringLabelMatchesSearch,
  pageTutorClassBookings,
  TutorClassBookingCreditSource,
} from '../tutor-class-booking.util';

type RawTutorClassBookingRow = {
  orderItemId: string;
  studentFirstName: string | null;
  studentLastName: string | null;
  catalogOfferingId: string | null;
  tutorCatalogOfferingId: string | null;
  tutorLeafDisplayName: string | null;
  deliveryMode: ClassSessionDeliveryModeEnum;
  status: ClassCreditStatusEnum;
  startsAt: Date | string | null;
  durationMinutes: string | number | null;
  unitRateInr: string | null;
  orderItemQuantity: string | null;
  lineSubtotalInr: string | null;
  orderItemDiscountInr: string | null;
  orderItemCgstInr: string | null;
  orderItemSgstInr: string | null;
  orderItemIgstInr: string | null;
  createdDate: Date | string;
  isDemo: boolean | string | null;
};

const CREDIT_SELECT = [
  'credit.order_item_id AS "orderItemId"',
  'studentUser.firstName AS "studentFirstName"',
  'studentUser.lastName AS "studentLastName"',
  'credit.catalog_offering_id AS "catalogOfferingId"',
  'tutorOffering.offering_id AS "tutorCatalogOfferingId"',
  'offering.display_name AS "tutorLeafDisplayName"',
  'credit.delivery_mode AS "deliveryMode"',
  'credit.status AS status',
  'calendar.starts_at AS "startsAt"',
  'calendar.duration_minutes AS "durationMinutes"',
  'orderItem.unit_rate_inr AS "unitRateInr"',
  'orderItem.quantity AS "orderItemQuantity"',
  'orderItem.line_subtotal_inr AS "lineSubtotalInr"',
  'orderItem.discount_inr AS "orderItemDiscountInr"',
  'orderItem.cgst_inr AS "orderItemCgstInr"',
  'orderItem.sgst_inr AS "orderItemSgstInr"',
  'orderItem.igst_inr AS "orderItemIgstInr"',
  'credit.createdDate AS "createdDate"',
  'credit.is_demo AS "isDemo"',
] as const;

function asNumber(value: string | number | null | undefined, fallback = 0): number {
  if (value == null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBool(value: boolean | string | null | undefined): boolean {
  return value === true || value === 'true' || value === 't' || value === '1';
}

@Injectable()
export class TutorClassBookingService {
  constructor(
    @InjectRepository(StudentClassCreditEntity)
    private readonly creditRepo: Repository<StudentClassCreditEntity>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
    private readonly offeringService: OfferingService,
  ) {}

  async list(
    user: User,
    input: TutorClassBookingListInput,
    now: Date = new Date(),
  ): Promise<TutorClassBookingListResult> {
    if (String(user.role).toUpperCase() !== UserRole.TUTOR) {
      throw new ForbiddenException('Only tutors can view booking history');
    }
    const tutor = await this.tutorRepo.findOne({
      where: { userId: user.id, deleted: false },
    });
    if (!tutor) {
      throw new ForbiddenException('Tutor profile not found');
    }

    const qb = this.creditRepo
      .createQueryBuilder('credit')
      .innerJoin('credit.student', 'student')
      .innerJoin('student.user', 'studentUser')
      .innerJoin('credit.tutorOffering', 'tutorOffering')
      .innerJoin('tutorOffering.offering', 'offering')
      .innerJoin('credit.orderItem', 'orderItem')
      .leftJoin('credit.enrollment', 'enrollment')
      .leftJoin('enrollment.session', 'session')
      .leftJoin('session.tutorCalendar', 'calendar')
      .where('credit.deleted = false')
      .andWhere('credit.tutor_id = :tutorId', { tutorId: tutor.id });

    applyTutorClassBookingStudentSearch(qb, input.studentSearch);

    const rows = await qb.select([...CREDIT_SELECT]).getRawMany<RawTutorClassBookingRow>();
    const offeringsById = offeringsByIdFromCatalog(await this.offeringService.findAll());
    const sources: TutorClassBookingCreditSource[] = rows.flatMap((row) => {
      const offeringLabel = resolveStudentCartOfferingDisplay(
        row.catalogOfferingId == null ? null : asNumber(row.catalogOfferingId),
        row.tutorCatalogOfferingId == null ? null : asNumber(row.tutorCatalogOfferingId),
        row.tutorLeafDisplayName,
        offeringsById,
      ).offeringLabel;
      if (!offeringLabelMatchesSearch(offeringLabel, input.offeringSearch)) {
        return [];
      }
      return [
        {
          orderItemId: asNumber(row.orderItemId),
          studentFirstName: row.studentFirstName,
          studentLastName: row.studentLastName,
          offeringLabel,
          deliveryMode: row.deliveryMode,
          status: row.status,
          startsAt: row.startsAt,
          durationMinutes:
            row.durationMinutes == null ? null : asNumber(row.durationMinutes, 60),
          orderItemPaidParts: {
            lineSubtotalInr: asNumber(row.lineSubtotalInr),
            discountInr: asNumber(row.orderItemDiscountInr),
            cgstInr: asNumber(row.orderItemCgstInr),
            sgstInr: asNumber(row.orderItemSgstInr),
            igstInr: asNumber(row.orderItemIgstInr),
            quantity: asNumber(row.orderItemQuantity, 1),
          },
          createdDate: new Date(row.createdDate),
          isDemo: asBool(row.isDemo),
        },
      ];
    });

    return pageTutorClassBookings(groupTutorClassBookings(sources, now), input);
  }
}
