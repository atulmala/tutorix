import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  activeClassCountForCancellationRefund,
  allocateRefundAcrossCredits,
  canChangeScheduledClass,
  classChangeDeadlineMessage,
  computeClassCancellationRefund,
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
  pickCreditsForCancellation,
  scheduledClassHasEnded,
} from '@tutorix/shared-utils';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { CommunicationAudience } from '../../communication/enums/communication-audience.enum';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { CommunicationService } from '../../communication/communication.service';
import { StudentService } from '../../student/services/student.service';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { TutorClassSessionEnrollmentEntity } from '../../tutor-class-session/entities/tutor-class-session-enrollment.entity';
import { TutorClassSessionEntity } from '../../tutor-class-session/entities/tutor-class-session.entity';
import { ClassSessionEnrollmentStatusEnum } from '../../tutor-class-session/enums/class-session-enrollment-status.enum';
import { ClassSessionStatusEnum } from '../../tutor-class-session/enums/class-session-status.enum';
import {
  orderItemToPaidParts,
  rateCardForOrderItem,
} from '../class-order-item-pricing.util';
import {
  buildClassScheduleTable,
  formatInrAmount,
} from '../class-booking-email-table.util';
import { OrderItemEntity } from '../../commerce/entities/order-item.entity';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import {
  CancelClassCreditsResult,
  ClassBookingCancellationBreakdown,
  PreviewClassBookingCancellationResult,
  TutorScheduledClassActionResult,
} from '../dto/student-cart.dto';
import { ClassCreditCancellationEntity } from '../entities/class-credit-cancellation.entity';
import { StudentClassCreditEntity } from '../entities/student-class-credit.entity';
import { ClassCreditRefundMethodEnum } from '../enums/class-credit-refund-method.enum';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';
import { ClassCancellationRefundInitiatedByEnum } from '../enums/class-cancellation-refund-initiated-by.enum';
import {
  ClassCancellationRefundRequestService,
  RefundBreakdownSnapshot,
} from './class-cancellation-refund-request.service';
import { ClassCancellationRefundChecksService } from './class-cancellation-refund-checks.service';

function personName(
  user?: { firstName?: string | null; lastName?: string | null } | null,
): string {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
}

function asId(value: string | number): number {
  const id = Number(value);
  if (!Number.isFinite(id) || id < 1) {
    throw new NotFoundException('Class not found');
  }
  return id;
}

@Injectable()
export class ClassCreditCancellationService {
  private readonly logger = new Logger(ClassCreditCancellationService.name);

  constructor(
    private readonly studentService: StudentService,
    private readonly dataSource: DataSource,
    @InjectRepository(StudentClassCreditEntity)
    private readonly creditRepo: Repository<StudentClassCreditEntity>,
    @InjectRepository(ClassCreditCancellationEntity)
    private readonly cancellationRepo: Repository<ClassCreditCancellationEntity>,
    @InjectRepository(TutorOfferingEntity)
    private readonly tutorOfferingRepo: Repository<TutorOfferingEntity>,
    private readonly rateCardService: TutorRateCardService,
    private readonly communicationService: CommunicationService,
    private readonly refundRequestService: ClassCancellationRefundRequestService,
    private readonly refundChecksService: ClassCancellationRefundChecksService,
  ) {}

  async previewClassBookingCancellation(
    user: User,
    orderItemIdInput: string | number,
    cancelCountInput: number,
  ): Promise<PreviewClassBookingCancellationResult> {
    const student = await this.requireStudent(user);
    const orderItemId = asId(orderItemIdInput);
    const cancelCount = Math.floor(Number(cancelCountInput));
    const { orderItem, picked, activeCount, cancellableCount } =
      await this.resolveOrderItemCancellation(student.id, orderItemId, cancelCount);
    const { breakdown } = await this.buildRefundBreakdown(
      orderItem,
      picked[0]?.tutorOfferingId ?? 0,
      activeCount,
      cancelCount,
    );
    return {
      orderItemId,
      cancellableCount,
      cancelCount,
      refundInr: breakdown.refundInr,
      breakdown: this.toBreakdownDto(breakdown),
    };
  }

  async cancelClassBooking(
    user: User,
    orderItemIdInput: string | number,
    cancelCountInput: number,
    refundMethod: ClassCreditRefundMethodEnum,
  ): Promise<CancelClassCreditsResult> {
    const student = await this.requireStudent(user);
    const orderItemId = asId(orderItemIdInput);
    const cancelCount = Math.floor(Number(cancelCountInput));
    const { picked } = await this.resolveOrderItemCancellation(
      student.id,
      orderItemId,
      cancelCount,
    );
    const creditIds = picked.map((credit) => credit.id);
    return this.cancel(user, creditIds, refundMethod);
  }

  async cancel(
    user: User,
    creditIdInputs: Array<string | number>,
    refundMethod: ClassCreditRefundMethodEnum,
  ): Promise<CancelClassCreditsResult> {
    const student = await this.requireStudent(user);
    const ids = [...new Set(creditIdInputs.map((value) => asId(value)))];
    if (ids.length === 0) {
      throw new BadRequestException('Choose at least one class to cancel');
    }

    const credits = await this.creditRepo.find({
      where: { id: In(ids), studentId: student.id, deleted: false },
      relations: [
        'orderItem',
        'enrollment',
        'enrollment.session',
        'enrollment.session.tutorCalendar',
      ],
      order: { id: 'ASC' },
    });
    if (credits.length !== ids.length) {
      throw new NotFoundException('One or more classes could not be cancelled');
    }

    for (const credit of credits) {
      this.assertCancellable(credit);
    }

    const { amountByCreditId, breakdownSnapshots } =
      await this.refundAmountsByCreditId(student.id, credits);
    const amountInr = credits.reduce(
      (sum, credit) => sum + (amountByCreditId.get(credit.id) ?? 0),
      0,
    );

    if (
      refundMethod === ClassCreditRefundMethodEnum.gateway &&
      amountInr > 0 &&
      !(await this.refundChecksService.canGatewayCoverAmount(user.id, amountInr))
    ) {
      throw new BadRequestException(
        'This amount cannot be refunded to your payment method. Add it to your wallet instead.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      for (const credit of credits) {
        const locked = await manager
          .getRepository(StudentClassCreditEntity)
          .createQueryBuilder('credit')
          .setLock('pessimistic_write')
          .where('credit.id = :id', { id: credit.id })
          .andWhere('credit.student_id = :studentId', { studentId: student.id })
          .andWhere('credit.deleted = false')
          .getOne();
        if (!locked || locked.status === ClassCreditStatusEnum.cancelled) {
          throw new BadRequestException('This class can no longer be cancelled');
        }
        if (locked.enrollmentId) {
          await this.releaseEnrollment(manager, locked.enrollmentId, student.id);
        }
        locked.status = ClassCreditStatusEnum.cancelled;
        locked.enrollmentId = null;
        await manager.getRepository(StudentClassCreditEntity).save(locked);
        await manager.getRepository(ClassCreditCancellationEntity).save(
          manager.getRepository(ClassCreditCancellationEntity).create({
            creditId: locked.id,
            studentId: student.id,
            userId: user.id,
            amountInr: amountByCreditId.get(locked.id) ?? 0,
            refundMethod,
          }),
        );
      }
    });

    const byOrderItem = new Map<number, StudentClassCreditEntity[]>();
    for (const credit of credits) {
      const bucket = byOrderItem.get(credit.orderItemId);
      if (bucket) {
        bucket.push(credit);
      } else {
        byOrderItem.set(credit.orderItemId, [credit]);
      }
    }

    let firstRefundRequestId: number | null = null;
    for (const [orderItemId, groupCredits] of byOrderItem) {
      const groupAmount = groupCredits.reduce(
        (sum, credit) => sum + (amountByCreditId.get(credit.id) ?? 0),
        0,
      );
      const snapshot = breakdownSnapshots.get(orderItemId);
      const primary = groupCredits[0];
      const refundRequest = await this.refundRequestService.createRequest({
        initiatedBy: ClassCancellationRefundInitiatedByEnum.student,
        studentId: student.id,
        tutorId: primary?.tutorId ?? null,
        tutorOfferingId: primary?.tutorOfferingId ?? null,
        orderItemId,
        orderId: primary?.orderId ?? null,
        classCount: groupCredits.length,
        amountInr: groupAmount,
        refundMethod,
        initiatedByUserId: user.id,
        creditIds: groupCredits.map((credit) => credit.id),
        refundBreakdown: this.mergeBreakdownSnapshot(
          snapshot,
          groupCredits,
          amountByCreditId,
        ),
      });
      if (refundRequest && firstRefundRequestId == null) {
        firstRefundRequestId = refundRequest.id;
      }
      if (refundRequest) {
        await this.emitRefundInitiated({
          requestId: refundRequest.id,
          studentUserId: user.id,
          credits: groupCredits,
          amountInr: groupAmount,
          refundMethod,
          isTutorInitiated: false,
          classCount: groupCredits.length,
          breakdownText: snapshot?.breakdownText,
        });
      }
    }

    return {
      cancelledCount: credits.length,
      amountInr,
      refundMethod,
      walletBalanceInr: null,
      refundRequestId: firstRefundRequestId,
      refundInitiated: amountInr > 0,
    };
  }

  async cancelScheduledClassByTutor(
    user: User,
    enrollmentIdInput: string | number,
  ): Promise<TutorScheduledClassActionResult> {
    const anchor = await this.requireTutorScheduledCredit(user, enrollmentIdInput);
    const credits = await this.creditsSharingSession(anchor);
    let amountRefundedInr = 0;

    const byStudent = new Map<number, StudentClassCreditEntity[]>();
    for (const credit of credits) {
      const bucket = byStudent.get(credit.studentId);
      if (bucket) {
        bucket.push(credit);
      } else {
        byStudent.set(credit.studentId, [credit]);
      }
    }

    await this.dataSource.transaction(async (manager) => {
      for (const credit of credits) {
        const locked = await this.lockTutorCredit(manager, credit.id, credit.tutorId);
        if (locked.enrollmentId) {
          await this.releaseEnrollment(manager, locked.enrollmentId, credit.studentId);
        }
        locked.status = ClassCreditStatusEnum.cancelled;
        locked.enrollmentId = null;
        await manager.getRepository(StudentClassCreditEntity).save(locked);
      }
      await this.markSessionCancelled(manager, anchor.enrollment?.session?.id);
    });

    for (const [studentId, studentCredits] of byStudent) {
      const studentUserId =
        studentCredits[0]?.student?.userId ?? studentCredits[0]?.student?.user?.id;
      if (!studentUserId) {
        throw new NotFoundException('Student not found');
      }
      const { amountByCreditId, breakdownSnapshots } =
        await this.refundAmountsByCreditId(studentId, studentCredits);

      for (const credit of studentCredits) {
        const amountInr = amountByCreditId.get(credit.id) ?? 0;
        await this.cancellationRepo.save(
          this.cancellationRepo.create({
            creditId: credit.id,
            studentId: credit.studentId,
            userId: user.id,
            amountInr,
            refundMethod: ClassCreditRefundMethodEnum.wallet,
          }),
        );
      }

      const byOrderItem = new Map<number, StudentClassCreditEntity[]>();
      for (const credit of studentCredits) {
        const bucket = byOrderItem.get(credit.orderItemId);
        if (bucket) {
          bucket.push(credit);
        } else {
          byOrderItem.set(credit.orderItemId, [credit]);
        }
      }

      for (const [orderItemId, groupCredits] of byOrderItem) {
        const groupAmount = groupCredits.reduce(
          (sum, credit) => sum + (amountByCreditId.get(credit.id) ?? 0),
          0,
        );
        amountRefundedInr += groupAmount;
        const snapshot = breakdownSnapshots.get(orderItemId);
        const primary = groupCredits[0];
        const refundRequest = await this.refundRequestService.createRequest({
          initiatedBy: ClassCancellationRefundInitiatedByEnum.tutor,
          studentId,
          tutorId: primary?.tutorId ?? anchor.tutorId,
          tutorOfferingId: primary?.tutorOfferingId ?? null,
          orderItemId,
          orderId: primary?.orderId ?? null,
          classCount: groupCredits.length,
          amountInr: groupAmount,
          refundMethod: ClassCreditRefundMethodEnum.wallet,
          initiatedByUserId: user.id,
          creditIds: groupCredits.map((credit) => credit.id),
          refundBreakdown: this.mergeBreakdownSnapshot(
            snapshot,
            groupCredits,
            amountByCreditId,
          ),
        });
        if (refundRequest) {
          await this.emitRefundInitiated({
            requestId: refundRequest.id,
            studentUserId,
            credits: groupCredits,
            amountInr: groupAmount,
            refundMethod: ClassCreditRefundMethodEnum.wallet,
            isTutorInitiated: true,
            classCount: groupCredits.length,
            breakdownText: snapshot?.breakdownText,
          });
        }
      }
    }

    return {
      enrollmentId: anchor.enrollmentId ?? asId(enrollmentIdInput),
      amountRefundedInr,
    };
  }

  async requestRescheduleByTutor(
    user: User,
    enrollmentIdInput: string | number,
  ): Promise<TutorScheduledClassActionResult> {
    const anchor = await this.requireTutorScheduledCredit(user, enrollmentIdInput);
    const credits = await this.creditsSharingSession(anchor);
    const enrollmentId = anchor.enrollmentId ?? asId(enrollmentIdInput);
    const notified: Array<{ credit: StudentClassCreditEntity; studentUserId: number }> = [];

    await this.dataSource.transaction(async (manager) => {
      for (const credit of credits) {
        const studentUserId = credit.student?.userId ?? credit.student?.user?.id;
        if (!studentUserId) {
          throw new NotFoundException('Student not found');
        }
        const locked = await this.lockTutorCredit(manager, credit.id, credit.tutorId);
        if (locked.enrollmentId) {
          await this.releaseEnrollment(manager, locked.enrollmentId, credit.studentId);
        }
        locked.status = ClassCreditStatusEnum.unscheduled;
        locked.enrollmentId = null;
        await manager.getRepository(StudentClassCreditEntity).save(locked);
        notified.push({ credit, studentUserId });
      }
      await this.markSessionCancelled(manager, anchor.enrollment?.session?.id);
    });

    for (const item of notified) {
      await this.emitTutorClassChange({
        event: CommunicationEvent.CLASS_RESCHEDULE_REQUESTED,
        credit: item.credit,
        studentUserId: item.studentUserId,
        amountInr: 0,
      });
    }

    return { enrollmentId, amountRefundedInr: 0 };
  }

  /** Every student still scheduled on the same class session. */
  private async creditsSharingSession(
    anchor: StudentClassCreditEntity,
  ): Promise<StudentClassCreditEntity[]> {
    const sessionId = anchor.enrollment?.session?.id;
    if (sessionId == null) {
      return [anchor];
    }
    const credits = await this.creditRepo.find({
      where: {
        tutorId: anchor.tutorId,
        status: ClassCreditStatusEnum.scheduled,
        deleted: false,
        enrollment: { sessionId },
      },
      relations: [
        'orderItem',
        'student',
        'student.user',
        'enrollment',
        'enrollment.session',
        'enrollment.session.tutorCalendar',
        'tutorOffering',
        'tutorOffering.offering',
        'tutorOffering.tutor',
        'tutorOffering.tutor.user',
      ],
    });
    return credits.length > 0 ? credits : [anchor];
  }

  private async markSessionCancelled(
    manager: DataSource['manager'],
    sessionId: number | undefined,
  ): Promise<void> {
    if (sessionId == null) {
      return;
    }
    const session = await manager
      .getRepository(TutorClassSessionEntity)
      .createQueryBuilder('s')
      .setLock('pessimistic_write')
      .where('s.id = :id', { id: sessionId })
      .andWhere('s.deleted = false')
      .getOne();
    if (!session) {
      return;
    }
    session.status = ClassSessionStatusEnum.cancelled;
    await manager.getRepository(TutorClassSessionEntity).save(session);
  }

  private assertCancellable(credit: StudentClassCreditEntity): void {
    if (credit.isDemo === true) {
      throw new BadRequestException('Demo classes cannot be cancelled');
    }
    if (credit.status === ClassCreditStatusEnum.cancelled) {
      throw new BadRequestException('This class is already cancelled');
    }
    if (credit.status === ClassCreditStatusEnum.unscheduled) {
      return;
    }
    const startsAt = credit.enrollment?.session?.tutorCalendar?.startsAt;
    const durationMinutes =
      credit.enrollment?.session?.tutorCalendar?.durationMinutes ?? null;
    if (scheduledClassHasEnded(startsAt, durationMinutes)) {
      throw new BadRequestException('Concluded classes cannot be cancelled');
    }
    if (!canChangeScheduledClass(startsAt, credit.deliveryMode)) {
      throw new BadRequestException(classChangeDeadlineMessage(credit.deliveryMode));
    }
  }

  private toBreakdownDto(
    breakdown: ReturnType<typeof computeClassCancellationRefund>,
  ): ClassBookingCancellationBreakdown {
    return {
      activeCount: breakdown.activeCount,
      cancelCount: breakdown.cancelCount,
      remainingCount: breakdown.remainingCount,
      netPaidBeforeInr: breakdown.netPaidBeforeInr,
      fairTotalAfterInr: breakdown.fairTotalAfterInr,
      refundInr: breakdown.refundInr,
      lines: breakdown.lines,
      breakdownText: breakdown.lines.join('\n'),
    };
  }

  private async resolveOrderItemCancellation(
    studentId: number,
    orderItemId: number,
    cancelCount: number,
  ): Promise<{
    orderItem: OrderItemEntity;
    picked: StudentClassCreditEntity[];
    activeCount: number;
    cancellableCount: number;
  }> {
    if (!Number.isFinite(cancelCount) || cancelCount < 1) {
      throw new BadRequestException('Enter how many classes to cancel');
    }
    const orderItem = await this.dataSource.getRepository(OrderItemEntity).findOne({
      where: { id: orderItemId, deleted: false },
    });
    if (!orderItem) {
      throw new NotFoundException('Booking not found');
    }
    const lineCredits = await this.creditRepo.find({
      where: { studentId, orderItemId, deleted: false },
      relations: [
        'orderItem',
        'enrollment',
        'enrollment.session',
        'enrollment.session.tutorCalendar',
      ],
      order: { id: 'ASC' },
    });
    if (lineCredits.length === 0) {
      throw new NotFoundException('Booking not found');
    }
    if (lineCredits.every((row) => row.isDemo)) {
      throw new BadRequestException('Demo bookings cannot be cancelled');
    }
    const pickInputs = lineCredits.map((credit) => ({
      id: credit.id,
      status: credit.status,
      isDemo: credit.isDemo,
      startsAt: credit.enrollment?.session?.tutorCalendar?.startsAt ?? null,
      durationMinutes:
        credit.enrollment?.session?.tutorCalendar?.durationMinutes ?? null,
      deliveryMode: credit.deliveryMode,
    }));
    const cancellableCount = pickInputs.filter((row) =>
      pickCreditsForCancellation([row], 1).length === 1,
    ).length;
    if (cancellableCount === 0) {
      throw new BadRequestException('No classes on this booking can be cancelled');
    }
    if (cancelCount > cancellableCount) {
      throw new BadRequestException(
        `You can cancel at most ${cancellableCount} class${cancellableCount === 1 ? '' : 'es'} on this booking`,
      );
    }
    const picked = pickCreditsForCancellation(pickInputs, cancelCount).map((row) => {
      const credit = lineCredits.find((candidate) => candidate.id === row.id);
      if (!credit) {
        throw new NotFoundException('Class not found');
      }
      return credit;
    });
    const activeCount = lineCredits.filter(
      (row) => row.status !== ClassCreditStatusEnum.cancelled,
    ).length;
    return { orderItem, picked, activeCount, cancellableCount };
  }

  private async priorRefundsInrForOrderItem(orderItemId: number): Promise<number> {
    const row = await this.cancellationRepo
      .createQueryBuilder('cancellation')
      .innerJoin(StudentClassCreditEntity, 'credit', 'credit.id = cancellation.credit_id')
      .where('credit.order_item_id = :orderItemId', { orderItemId })
      .select('COALESCE(SUM(cancellation.amount_inr), 0)', 'total')
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  private async buildRefundBreakdown(
    orderItem: OrderItemEntity,
    tutorOfferingId: number,
    activeCount: number,
    cancelCount: number,
  ) {
    const pricing = await this.resolvePricing(orderItem, tutorOfferingId);
    if (!pricing) {
      throw new BadRequestException('Pricing for this booking is unavailable');
    }
    const priorRefundsInr = await this.priorRefundsInrForOrderItem(orderItem.id);
    const breakdown = computeClassCancellationRefund({
      parts: orderItemToPaidParts(orderItem),
      mode: pricing.mode,
      rateCard: pricing.rateCard,
      activeCount,
      cancelCount,
      priorRefundsInr,
    });
    return { breakdown, pricing };
  }

  private async resolvePricing(
    orderItem: OrderItemEntity,
    tutorOfferingId: number,
  ): Promise<{ mode: 'online' | 'offline'; rateCard: import('@tutorix/shared-utils').RateCardLike } | null> {
    const offering = tutorOfferingId
      ? await this.tutorOfferingRepo.findOne({
          where: { id: tutorOfferingId, deleted: false },
        })
      : null;
    const fallbackMap = offering
      ? await this.rateCardService.resolveCompleteRateCards([offering])
      : new Map();
    const fallback = offering ? fallbackMap.get(offering.id) ?? null : null;
    return rateCardForOrderItem(orderItem, fallback);
  }

  private mergeBreakdownSnapshot(
    snapshot: RefundBreakdownSnapshot | undefined,
    credits: StudentClassCreditEntity[],
    amountByCreditId: Map<number, number>,
  ): RefundBreakdownSnapshot {
    return {
      ...snapshot,
      perCreditAmounts: credits.map((credit) => ({
        creditId: credit.id,
        amountInr: amountByCreditId.get(credit.id) ?? 0,
      })),
    };
  }

  private async refundAmountsByCreditId(
    studentId: number,
    credits: StudentClassCreditEntity[],
  ): Promise<{
    amountByCreditId: Map<number, number>;
    breakdownSnapshots: Map<number, RefundBreakdownSnapshot>;
  }> {
    const amounts = new Map<number, number>();
    const breakdownSnapshots = new Map<number, RefundBreakdownSnapshot>();
    const byOrderItem = new Map<number, StudentClassCreditEntity[]>();
    for (const credit of credits) {
      const bucket = byOrderItem.get(credit.orderItemId);
      if (bucket) {
        bucket.push(credit);
      } else {
        byOrderItem.set(credit.orderItemId, [credit]);
      }
    }
    for (const [orderItemId, groupCredits] of byOrderItem) {
      const orderItem =
        groupCredits[0]?.orderItem ??
        (await this.dataSource.getRepository(OrderItemEntity).findOne({
          where: { id: orderItemId, deleted: false },
        }));
      if (!orderItem) {
        for (const credit of groupCredits) {
          amounts.set(credit.id, 0);
        }
        continue;
      }
      const lineCredits = await this.creditRepo.find({
        where: { studentId, orderItemId, deleted: false },
      });
      const activeCount = activeClassCountForCancellationRefund(
        lineCredits,
        groupCredits.map((credit) => credit.id),
      );
      const priorRefundsInr = await this.priorRefundsInrForOrderItem(orderItemId);
      const { breakdown } = await this.buildRefundBreakdown(
        orderItem,
        groupCredits[0]?.tutorOfferingId ?? 0,
        activeCount,
        groupCredits.length,
      );
      breakdownSnapshots.set(orderItemId, {
        breakdownText: breakdown.lines.join('\n'),
        lines: breakdown.lines,
        orderItemId,
        activeCount,
        cancelCount: groupCredits.length,
        priorRefundsInr,
        refundInr: breakdown.refundInr,
      });
      const allocations = allocateRefundAcrossCredits(
        breakdown.refundInr,
        groupCredits.length,
      );
      groupCredits.forEach((credit, index) => {
        amounts.set(credit.id, allocations[index] ?? 0);
      });
    }
    return { amountByCreditId: amounts, breakdownSnapshots };
  }

  private async emitRefundInitiated(params: {
    requestId: number;
    studentUserId: number;
    credits: StudentClassCreditEntity[];
    amountInr: number;
    refundMethod: ClassCreditRefundMethodEnum;
    isTutorInitiated: boolean;
    classCount: number;
    breakdownText?: string;
  }): Promise<void> {
    const credit = params.credits[0];
    if (!credit) {
      return;
    }
    const startsAt = credit.enrollment?.session?.tutorCalendar?.startsAt;
    const duration =
      credit.enrollment?.session?.tutorCalendar?.durationMinutes ?? 60;
    const classTime = startsAt
      ? `${formatIstBookingDateLabel(startsAt)} ${formatIstBookingTimeRange(startsAt, duration)}`
      : 'your class';
    const tutorName = personName(credit.tutorOffering?.tutor?.user) || 'Your tutor';
    const studentName = personName(credit.student?.user) || 'Student';
    const offeringName = credit.tutorOffering?.offering?.displayName ?? 'Class';
    const deliveryMode = credit.deliveryMode === 'online' ? 'Online' : 'Offline';
    const table = buildClassScheduleTable({
      counterpartLabel: 'Tutor',
      counterpartName: tutorName,
      offeringLabel: offeringName,
      deliveryMode,
      classTime,
    });
    const refundMethodLabel =
      params.refundMethod === ClassCreditRefundMethodEnum.wallet
        ? 'Wallet'
        : 'Cash to payment method';
    const expectedTimeline =
      params.refundMethod === ClassCreditRefundMethodEnum.wallet
        ? 'after our team processes your refund'
        : 'within 2 working days after processing';
    try {
      await this.communicationService.emit({
        event: CommunicationEvent.CLASS_CANCELLATION_REFUND_INITIATED,
        userId: params.studentUserId,
        audience: CommunicationAudience.STUDENT,
        entityType: 'class_cancellation_refund_request',
        entityId: params.requestId,
        payload: {
          studentName,
          tutorName,
          offeringName,
          deliveryMode,
          classTime,
          classCount: String(params.classCount),
          amountRefunded: formatInrAmount(params.amountInr),
          refundMethodLabel,
          initiatedByLabel: params.isTutorInitiated ? 'Your tutor' : 'You',
          expectedTimeline,
          isTutorInitiated: params.isTutorInitiated ? 'true' : 'false',
          requestId: String(params.requestId),
          breakdownText: params.breakdownText ?? '',
          linesHtml: table.html,
          linesText: table.text,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Refund initiated emit failed for request ${params.requestId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async releaseEnrollment(
    manager: DataSource['manager'],
    enrollmentId: number,
    studentId: number,
  ): Promise<void> {
    const enrollment = await manager
      .getRepository(TutorClassSessionEnrollmentEntity)
      .createQueryBuilder('e')
      .setLock('pessimistic_write')
      .where('e.id = :id', { id: enrollmentId })
      .andWhere('e.deleted = false')
      .getOne();
    if (!enrollment || enrollment.studentId !== studentId) {
      return;
    }
    enrollment.status = ClassSessionEnrollmentStatusEnum.cancelled;
    await manager.getRepository(TutorClassSessionEnrollmentEntity).save(enrollment);

    const session = await manager
      .getRepository(TutorClassSessionEntity)
      .createQueryBuilder('s')
      .setLock('pessimistic_write')
      .where('s.id = :id', { id: enrollment.sessionId })
      .andWhere('s.deleted = false')
      .getOne();
    if (!session) {
      return;
    }
    const remaining = await manager.getRepository(TutorClassSessionEnrollmentEntity).count({
      where: {
        sessionId: session.id,
        deleted: false,
        status: ClassSessionEnrollmentStatusEnum.confirmed,
      },
    });
    session.status =
      remaining >= session.batchSize
        ? ClassSessionStatusEnum.full
        : ClassSessionStatusEnum.open;
    await manager.getRepository(TutorClassSessionEntity).save(session);
  }

  private async requireTutorScheduledCredit(
    user: User,
    enrollmentIdInput: string | number,
  ): Promise<StudentClassCreditEntity> {
    if (String(user.role).toUpperCase() !== UserRole.TUTOR) {
      throw new ForbiddenException('Only tutors can change a scheduled class');
    }
    const tutor = await this.dataSource.getRepository(Tutor).findOne({
      where: { userId: user.id, deleted: false },
    });
    if (!tutor) {
      throw new ForbiddenException('Tutor profile not found');
    }
    const credit = await this.creditRepo.findOne({
      where: {
        enrollmentId: asId(enrollmentIdInput),
        tutorId: tutor.id,
        deleted: false,
      },
      relations: [
        'orderItem',
        'student',
        'student.user',
        'enrollment',
        'enrollment.session',
        'enrollment.session.tutorCalendar',
        'tutorOffering',
        'tutorOffering.offering',
        'tutorOffering.tutor',
        'tutorOffering.tutor.user',
      ],
    });
    if (!credit || credit.status !== ClassCreditStatusEnum.scheduled) {
      throw new NotFoundException('This class is not on your schedule');
    }
    const startsAt = credit.enrollment?.session?.tutorCalendar?.startsAt;
    if (!canChangeScheduledClass(startsAt, credit.deliveryMode)) {
      throw new BadRequestException(classChangeDeadlineMessage(credit.deliveryMode));
    }
    return credit;
  }

  private async lockTutorCredit(
    manager: DataSource['manager'],
    creditId: number,
    tutorId: number,
  ): Promise<StudentClassCreditEntity> {
    const locked = await manager
      .getRepository(StudentClassCreditEntity)
      .createQueryBuilder('credit')
      .setLock('pessimistic_write')
      .where('credit.id = :id', { id: creditId })
      .andWhere('credit.tutor_id = :tutorId', { tutorId })
      .andWhere('credit.deleted = false')
      .getOne();
    if (!locked || locked.status !== ClassCreditStatusEnum.scheduled) {
      throw new BadRequestException('This class can no longer be changed');
    }
    return locked;
  }

  private async emitTutorClassChange(params: {
    event: CommunicationEvent;
    credit: StudentClassCreditEntity;
    studentUserId: number;
    amountInr: number;
  }): Promise<void> {
    const startsAt = params.credit.enrollment?.session?.tutorCalendar?.startsAt;
    const duration =
      params.credit.enrollment?.session?.tutorCalendar?.durationMinutes ?? 60;
    const classTime = startsAt
      ? `${formatIstBookingDateLabel(startsAt)} ${formatIstBookingTimeRange(startsAt, duration)}`
      : 'the scheduled time';
    const tutorName =
      personName(params.credit.tutorOffering?.tutor?.user) || 'Your tutor';
    const studentName = personName(params.credit.student?.user) || 'Student';
    const offeringName =
      params.credit.tutorOffering?.offering?.displayName ?? 'Class';
    const deliveryMode =
      params.credit.deliveryMode === 'online' ? 'Online' : 'Offline';
    const table = buildClassScheduleTable({
      counterpartLabel: 'Tutor',
      counterpartName: tutorName,
      offeringLabel: offeringName,
      deliveryMode,
      classTime,
    });
    try {
      await this.communicationService.emit({
        event: params.event,
        userId: params.studentUserId,
        audience: CommunicationAudience.STUDENT,
        entityType: 'class_credit',
        entityId: params.credit.id,
        payload: {
          studentName,
          tutorName,
          offeringName,
          deliveryMode,
          classTime,
          amountRefunded: formatInrAmount(params.amountInr),
          linesHtml: table.html,
          linesText: table.text,
        },
      });
    } catch (error) {
      this.logger.warn(
        `${params.event} emit failed for credit ${params.credit.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async requireStudent(user: User) {
    if (String(user.role).toUpperCase() !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can cancel classes');
    }
    const student = await this.studentService.findByUserId(user.id);
    if (!student) {
      throw new ForbiddenException('Student profile not found');
    }
    return student;
  }
}
