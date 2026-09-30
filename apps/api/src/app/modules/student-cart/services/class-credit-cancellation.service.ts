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
  canChangeScheduledClass,
  classChangeDeadlineMessage,
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
} from '@tutorix/shared-utils';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { CommunicationAudience } from '../../communication/enums/communication-audience.enum';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { CommunicationService } from '../../communication/communication.service';
import { PaymentAttemptEntity } from '../../commerce/entities/payment-attempt.entity';
import { PaymentAttemptStatusEnum } from '../../commerce/enums/commerce.enums';
import { RazorpayGateway } from '../../payment/services/payment-gateways';
import { StudentService } from '../../student/services/student.service';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { TutorClassSessionEnrollmentEntity } from '../../tutor-class-session/entities/tutor-class-session-enrollment.entity';
import { TutorClassSessionEntity } from '../../tutor-class-session/entities/tutor-class-session.entity';
import { ClassSessionEnrollmentStatusEnum } from '../../tutor-class-session/enums/class-session-enrollment-status.enum';
import { ClassSessionStatusEnum } from '../../tutor-class-session/enums/class-session-status.enum';
import { WalletService } from '../../wallet/services/wallet.service';
import { orderItemPaidInrPerCredit } from '../admin-class-booking-order-item.util';
import { allocateGatewayRefund } from '../class-credit-refund-allocation.util';
import {
  buildClassScheduleTable,
  formatInrAmount,
} from '../class-booking-email-table.util';
import {
  CancelClassCreditsResult,
  TutorScheduledClassActionResult,
} from '../dto/student-cart.dto';
import { ClassCreditCancellationEntity } from '../entities/class-credit-cancellation.entity';
import { ClassCreditGatewayRefundEntity } from '../entities/class-credit-gateway-refund.entity';
import { StudentClassCreditEntity } from '../entities/student-class-credit.entity';
import { ClassCreditRefundMethodEnum } from '../enums/class-credit-refund-method.enum';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';

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
    private readonly walletService: WalletService,
    private readonly razorpayGateway: RazorpayGateway,
    private readonly dataSource: DataSource,
    @InjectRepository(StudentClassCreditEntity)
    private readonly creditRepo: Repository<StudentClassCreditEntity>,
    @InjectRepository(PaymentAttemptEntity)
    private readonly paymentAttemptRepo: Repository<PaymentAttemptEntity>,
    @InjectRepository(ClassCreditGatewayRefundEntity)
    private readonly gatewayRefundRepo: Repository<ClassCreditGatewayRefundEntity>,
    private readonly communicationService: CommunicationService,
  ) {}

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

    const amountInr = credits.reduce(
      (sum, credit) =>
        sum + (credit.orderItem ? orderItemPaidInrPerCredit(credit.orderItem) : 0),
      0,
    );

    const gatewayRefunds =
      refundMethod === ClassCreditRefundMethodEnum.gateway && amountInr > 0
        ? await this.refundThroughGateway(user.id, amountInr)
        : [];

    let walletBalanceInr: number | null = null;
    try {
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
            amountInr: credit.orderItem ? orderItemPaidInrPerCredit(credit.orderItem) : 0,
            refundMethod,
          }),
        );
      }

      for (const refund of gatewayRefunds) {
        await manager.getRepository(ClassCreditGatewayRefundEntity).save(
          manager.getRepository(ClassCreditGatewayRefundEntity).create({
            userId: user.id,
            paymentAttemptId: refund.paymentAttemptId,
            gatewayPaymentId: refund.gatewayPaymentId,
            gatewayRefundId: refund.gatewayRefundId,
            amountInr: refund.amountInr,
          }),
        );
      }

      if (refundMethod === ClassCreditRefundMethodEnum.wallet && amountInr > 0) {
        const wallet = await this.walletService.creditClassRefundWithManager(manager, {
          userId: user.id,
          amountInr,
          commerceOrderId: credits[0]?.orderId,
          referenceType: 'class_credit',
          referenceId: credits[0]?.id,
          description:
            credits.length === 1
              ? 'Class cancellation refund'
              : `Class cancellation refund · ${credits.length} classes`,
        });
        walletBalanceInr = wallet.balanceInr;
      }
    });
    } catch (error) {
      if (gatewayRefunds.length > 0) {
        this.logger.error(
          `Gateway refund succeeded but class cancellation was not saved: ${JSON.stringify(gatewayRefunds)}`,
        );
      }
      throw error;
    }

    return {
      cancelledCount: credits.length,
      amountInr,
      refundMethod,
      walletBalanceInr,
    };
  }

  async cancelScheduledClassByTutor(
    user: User,
    enrollmentIdInput: string | number,
  ): Promise<TutorScheduledClassActionResult> {
    const credit = await this.requireTutorScheduledCredit(user, enrollmentIdInput);
    const amountInr = credit.orderItem
      ? orderItemPaidInrPerCredit(credit.orderItem)
      : 0;
    const studentUserId = credit.student?.userId ?? credit.student?.user?.id;
    if (!studentUserId) {
      throw new NotFoundException('Student not found');
    }

    await this.dataSource.transaction(async (manager) => {
      const locked = await this.lockTutorCredit(manager, credit.id, credit.tutorId);
      if (locked.enrollmentId) {
        await this.releaseEnrollment(manager, locked.enrollmentId, credit.studentId);
      }
      locked.status = ClassCreditStatusEnum.cancelled;
      locked.enrollmentId = null;
      await manager.getRepository(StudentClassCreditEntity).save(locked);
      await manager.getRepository(ClassCreditCancellationEntity).save(
        manager.getRepository(ClassCreditCancellationEntity).create({
          creditId: locked.id,
          studentId: credit.studentId,
          userId: user.id,
          amountInr,
          refundMethod: ClassCreditRefundMethodEnum.wallet,
        }),
      );
      if (amountInr > 0) {
        await this.walletService.creditClassRefundWithManager(manager, {
          userId: studentUserId,
          amountInr,
          commerceOrderId: credit.orderId,
          referenceType: 'class_credit',
          referenceId: credit.id,
          description: 'Class cancelled by tutor',
        });
      }
    });

    await this.emitTutorClassChange({
      event: CommunicationEvent.CLASS_CANCELLED_BY_TUTOR,
      credit,
      studentUserId,
      amountInr,
    });

    return { enrollmentId: credit.enrollmentId ?? asId(enrollmentIdInput), amountRefundedInr: amountInr };
  }

  async requestRescheduleByTutor(
    user: User,
    enrollmentIdInput: string | number,
  ): Promise<TutorScheduledClassActionResult> {
    const credit = await this.requireTutorScheduledCredit(user, enrollmentIdInput);
    const studentUserId = credit.student?.userId ?? credit.student?.user?.id;
    if (!studentUserId) {
      throw new NotFoundException('Student not found');
    }
    const enrollmentId = credit.enrollmentId ?? asId(enrollmentIdInput);

    await this.dataSource.transaction(async (manager) => {
      const locked = await this.lockTutorCredit(manager, credit.id, credit.tutorId);
      if (locked.enrollmentId) {
        await this.releaseEnrollment(manager, locked.enrollmentId, credit.studentId);
      }
      locked.status = ClassCreditStatusEnum.unscheduled;
      locked.enrollmentId = null;
      await manager.getRepository(StudentClassCreditEntity).save(locked);
    });

    await this.emitTutorClassChange({
      event: CommunicationEvent.CLASS_RESCHEDULE_REQUESTED,
      credit,
      studentUserId,
      amountInr: 0,
    });

    return { enrollmentId, amountRefundedInr: 0 };
  }

  private assertCancellable(credit: StudentClassCreditEntity): void {
    if (credit.status === ClassCreditStatusEnum.cancelled) {
      throw new BadRequestException('This class is already cancelled');
    }
    if (credit.status === ClassCreditStatusEnum.unscheduled) {
      return;
    }
    const startsAt = credit.enrollment?.session?.tutorCalendar?.startsAt;
    if (!canChangeScheduledClass(startsAt, credit.deliveryMode)) {
      throw new BadRequestException(classChangeDeadlineMessage(credit.deliveryMode));
    }
  }

  private async refundThroughGateway(
    userId: number,
    amountInr: number,
  ): Promise<
    Array<{
      paymentAttemptId: number;
      gatewayPaymentId: string;
      gatewayRefundId: string;
      amountInr: number;
    }>
  > {
    const attempts = await this.paymentAttemptRepo
      .createQueryBuilder('attempt')
      .innerJoin('attempt.order', 'order')
      .where('order.user_id = :userId', { userId })
      .andWhere('attempt.status = :status', { status: PaymentAttemptStatusEnum.paid })
      .andWhere('attempt.gateway_payment_id IS NOT NULL')
      .andWhere('attempt.deleted = false')
      .orderBy('attempt.id', 'DESC')
      .getMany();

    const refundedRows = await this.gatewayRefundRepo
      .createQueryBuilder('refund')
      .select('refund.payment_attempt_id', 'paymentAttemptId')
      .addSelect('SUM(refund.amount_inr)', 'total')
      .where('refund.user_id = :userId', { userId })
      .andWhere('refund.deleted = false')
      .groupBy('refund.payment_attempt_id')
      .getRawMany<{ paymentAttemptId: string; total: string }>();
    const refundedByAttempt = new Map(
      refundedRows.map((row) => [Number(row.paymentAttemptId), Number(row.total)]),
    );

    const slices = allocateGatewayRefund(
      amountInr,
      attempts.map((attempt) => ({
        paymentAttemptId: attempt.id,
        gatewayPaymentId: attempt.gatewayPaymentId ?? '',
        amountInr: attempt.amountInr,
        refundedInr: refundedByAttempt.get(attempt.id) ?? 0,
      })),
    );
    if (slices.length === 0) {
      throw new BadRequestException(
        'This amount cannot be refunded to your payment method. Add it to your wallet instead.',
      );
    }

    const completed: Array<{
      paymentAttemptId: number;
      gatewayPaymentId: string;
      gatewayRefundId: string;
      amountInr: number;
    }> = [];
    for (const slice of slices) {
      try {
        const gatewayRefundId = await this.razorpayGateway.refundPayment(
          slice.gatewayPaymentId,
          slice.amountInr,
        );
        completed.push({ ...slice, gatewayRefundId });
      } catch (error) {
        this.logger.error(
          `Gateway refund failed for payment ${slice.gatewayPaymentId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        if (completed.length > 0) {
          await this.gatewayRefundRepo.save(
            completed.map((refund) => this.gatewayRefundRepo.create(refund)),
          );
          throw new BadRequestException(
            'Part of this refund was sent to your payment method, but the cancellation did not finish. Contact support before trying again.',
          );
        }
        throw new BadRequestException(
          'The payment gateway could not refund this amount. Add it to your wallet instead.',
        );
      }
    }
    return completed;
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
