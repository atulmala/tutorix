import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
  getBatchSizeForMode,
} from '@tutorix/shared-utils';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { OrderEntity } from '../../commerce/entities/order.entity';
import { OrderItemEntity } from '../../commerce/entities/order-item.entity';
import {
  OrderItemFulfillmentStatusEnum,
  OrderItemTypeEnum,
} from '../../commerce/enums/commerce.enums';
import { CommunicationAudience } from '../../communication/enums/communication-audience.enum';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { CommunicationService } from '../../communication/communication.service';
import { StudentService } from '../../student/services/student.service';
import { TutorCalendar } from '../../tutor-calendar/entities/tutor-calendar.entity';
import { TutorClassSessionEnrollmentEntity } from '../../tutor-class-session/entities/tutor-class-session-enrollment.entity';
import { TutorClassSessionEntity } from '../../tutor-class-session/entities/tutor-class-session.entity';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { ClassSessionEnrollmentStatusEnum } from '../../tutor-class-session/enums/class-session-enrollment-status.enum';
import { ClassSessionStatusEnum } from '../../tutor-class-session/enums/class-session-status.enum';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import {
  ScheduleClassCreditResult,
  StudentClassCreditDto,
} from '../dto/student-cart.dto';
import { StudentCartItemEntity } from '../entities/student-cart-item.entity';
import { StudentClassCreditEntity } from '../entities/student-class-credit.entity';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';

function asId(value: string | number): number {
  const id = Number(value);
  if (!Number.isFinite(id) || id < 1) {
    throw new NotFoundException('Not found');
  }
  return id;
}

function personName(user?: { firstName?: string | null; lastName?: string | null } | null): string {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
}

@Injectable()
export class StudentClassCreditService {
  private readonly logger = new Logger(StudentClassCreditService.name);

  constructor(
    private readonly studentService: StudentService,
    private readonly rateCardService: TutorRateCardService,
    private readonly communicationService: CommunicationService,
    private readonly dataSource: DataSource,
    @InjectRepository(StudentClassCreditEntity)
    private readonly creditRepo: Repository<StudentClassCreditEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
    @InjectRepository(TutorOfferingEntity)
    private readonly tutorOfferingRepo: Repository<TutorOfferingEntity>,
  ) {}

  async fulfillPaidOrder(
    order: OrderEntity,
    studentId: number,
    cartItems: StudentCartItemEntity[],
  ): Promise<void> {
    const items = order.items?.length
      ? order.items
      : await this.orderItemRepo.find({
          where: { orderId: order.id, deleted: false },
        });
    const unusedCart = [...cartItems];
    for (const item of items) {
      if (item.itemType !== OrderItemTypeEnum.CLASS_BOOKING) {
        continue;
      }
      const existing = await this.creditRepo.count({
        where: { orderItemId: item.id, deleted: false },
      });
      if (existing > 0) {
        item.fulfillmentStatus = OrderItemFulfillmentStatusEnum.fulfilled;
        await this.orderItemRepo.save(item);
        continue;
      }
      const cartItemIndex = unusedCart.findIndex(
        (row) =>
          row.tutorOfferingId === item.referenceId &&
          row.quantity === item.quantity,
      );
      const cartItem =
        cartItemIndex >= 0 ? unusedCart.splice(cartItemIndex, 1)[0] : unusedCart.shift();
      const offering = await this.tutorOfferingRepo.findOne({
        where: { id: item.referenceId, deleted: false },
      });
      if (!offering) {
        item.fulfillmentStatus = OrderItemFulfillmentStatusEnum.failed;
        await this.orderItemRepo.save(item);
        continue;
      }
      const deliveryMode =
        cartItem?.deliveryMode ?? ClassSessionDeliveryModeEnum.offline;
      const credits = Array.from({ length: item.quantity }, () =>
        this.creditRepo.create({
          studentId,
          orderId: order.id,
          orderItemId: item.id,
          tutorId: offering.tutorId,
          tutorOfferingId: offering.id,
          deliveryMode,
          status: ClassCreditStatusEnum.unscheduled,
        }),
      );
      await this.creditRepo.save(credits);
      item.fulfillmentStatus = OrderItemFulfillmentStatusEnum.fulfilled;
      await this.orderItemRepo.save(item);
    }
  }

  async listCredits(user: User): Promise<StudentClassCreditDto[]> {
    const student = await this.requireStudent(user);
    const rows = await this.creditRepo.find({
      where: { studentId: student.id, deleted: false },
      relations: [
        'tutorOffering',
        'tutorOffering.offering',
        'tutorOffering.tutor',
        'tutorOffering.tutor.user',
        'enrollment',
        'enrollment.session',
        'enrollment.session.tutorCalendar',
      ],
      order: { id: 'ASC' },
    });
    return rows
      .filter((row) => row.status !== ClassCreditStatusEnum.cancelled)
      .map((row) => this.toDto(row));
  }

  async schedule(
    user: User,
    creditIdInput: string | number,
    tutorCalendarIdInput: string | number,
  ): Promise<ScheduleClassCreditResult> {
    return this.assignSlot(user, asId(creditIdInput), asId(tutorCalendarIdInput), false);
  }

  async reschedule(
    user: User,
    creditIdInput: string | number,
    tutorCalendarIdInput: string | number,
  ): Promise<ScheduleClassCreditResult> {
    return this.assignSlot(user, asId(creditIdInput), asId(tutorCalendarIdInput), true);
  }

  private async assignSlot(
    user: User,
    creditId: number,
    tutorCalendarId: number,
    allowReschedule: boolean,
  ): Promise<ScheduleClassCreditResult> {
    const student = await this.requireStudent(user);
    const credit = await this.creditRepo.findOne({
      where: { id: creditId, studentId: student.id, deleted: false },
      relations: [
        'tutorOffering',
        'tutorOffering.offering',
        'tutorOffering.tutor',
        'tutorOffering.tutor.user',
      ],
    });
    if (!credit) {
      throw new NotFoundException('Class credit not found');
    }
    if (credit.status === ClassCreditStatusEnum.cancelled) {
      throw new BadRequestException('This class is no longer available');
    }
    if (credit.status === ClassCreditStatusEnum.scheduled && !allowReschedule) {
      throw new BadRequestException('This class is already scheduled');
    }
    if (credit.status === ClassCreditStatusEnum.unscheduled && allowReschedule) {
      throw new BadRequestException('This class is not scheduled yet');
    }

    const tutorOffering = credit.tutorOffering;
    if (!tutorOffering) {
      throw new NotFoundException('Tutor offering not found');
    }
    const rateCard = await this.rateCardService.findByTutorOfferingId(
      tutorOffering.id,
    );
    const batchSize = getBatchSizeForMode(rateCard ?? {}, credit.deliveryMode);

    const result = await this.dataSource.transaction(async (manager) => {
      if (allowReschedule && credit.enrollmentId) {
        await this.releaseEnrollment(manager, credit.enrollmentId, student.id);
      }

      const slot = await manager
        .getRepository(TutorCalendar)
        .createQueryBuilder('c')
        .setLock('pessimistic_write')
        .where('c.id = :id', { id: tutorCalendarId })
        .andWhere('c.deleted = false')
        .getOne();
      if (!slot) {
        throw new NotFoundException('This slot is no longer available');
      }
      if (slot.tutorId !== tutorOffering.tutorId) {
        throw new BadRequestException('This slot is no longer available');
      }
      if (slot.startsAt.getTime() <= Date.now()) {
        throw new BadRequestException('This slot is in the past');
      }

      let session = await manager
        .getRepository(TutorClassSessionEntity)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.tutor_calendar_id = :id', { id: slot.id })
        .andWhere('s.deleted = false')
        .getOne();

      if (session) {
        if (
          session.status === ClassSessionStatusEnum.cancelled ||
          session.tutorOfferingId !== tutorOffering.id ||
          session.deliveryMode !== credit.deliveryMode
        ) {
          throw new BadRequestException(
            'This slot is already booked for a different class',
          );
        }
      } else {
        session = await manager.getRepository(TutorClassSessionEntity).save(
          manager.getRepository(TutorClassSessionEntity).create({
            tutorCalendarId: slot.id,
            tutorOfferingId: tutorOffering.id,
            deliveryMode: credit.deliveryMode,
            batchSize,
            status: ClassSessionStatusEnum.open,
          }),
        );
      }

      const enrollments = await manager
        .getRepository(TutorClassSessionEnrollmentEntity)
        .createQueryBuilder('e')
        .setLock('pessimistic_write')
        .where('e.session_id = :sessionId', { sessionId: session.id })
        .andWhere('e.deleted = false')
        .getMany();
      const confirmed = enrollments.filter(
        (row) => row.status === ClassSessionEnrollmentStatusEnum.confirmed,
      );
      if (confirmed.some((row) => row.studentId === student.id)) {
        throw new BadRequestException('You have already booked this class');
      }
      if (confirmed.length >= session.batchSize) {
        throw new BadRequestException('This class is full');
      }

      const enrollment = await manager
        .getRepository(TutorClassSessionEnrollmentEntity)
        .save(
          manager.getRepository(TutorClassSessionEnrollmentEntity).create({
            sessionId: session.id,
            studentId: student.id,
            status: ClassSessionEnrollmentStatusEnum.confirmed,
          }),
        );

      const nextConfirmed = confirmed.length + 1;
      const nextStatus =
        nextConfirmed >= session.batchSize
          ? ClassSessionStatusEnum.full
          : ClassSessionStatusEnum.open;
      if (session.status !== nextStatus) {
        session.status = nextStatus;
        await manager.getRepository(TutorClassSessionEntity).save(session);
      }

      credit.enrollmentId = enrollment.id;
      credit.status = ClassCreditStatusEnum.scheduled;
      await manager.getRepository(StudentClassCreditEntity).save(credit);

      return {
        session,
        enrollment,
        slot,
        offeringName: tutorOffering.offering?.displayName ?? 'Class',
      };
    });

    await this.emitClassBooked({
      studentUserId: user.id,
      tutorUserId: tutorOffering.tutor?.userId ?? tutorOffering.tutor?.user?.id,
      studentName: personName(student.user) || 'Student',
      tutorName: personName(tutorOffering.tutor?.user) || 'Tutor',
      offeringName: result.offeringName,
      startsAt: result.slot.startsAt,
      durationMinutes: result.slot.durationMinutes,
      sessionId: result.session.id,
    });

    return {
      creditId: credit.id,
      enrollmentId: result.enrollment.id,
      sessionId: result.session.id,
    };
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
    const remaining = await manager
      .getRepository(TutorClassSessionEnrollmentEntity)
      .count({
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

  private toDto(row: StudentClassCreditEntity): StudentClassCreditDto {
    const startsAt =
      row.enrollment?.session?.tutorCalendar?.startsAt ?? null;
    return {
      id: row.id,
      tutorId: row.tutorId,
      tutorOfferingId: row.tutorOfferingId,
      offeringId: row.tutorOffering?.offeringId ?? 0,
      tutorName: personName(row.tutorOffering?.tutor?.user) || 'Tutor',
      offeringLabel: row.tutorOffering?.offering?.displayName ?? 'Class',
      deliveryMode: row.deliveryMode,
      status: row.status,
      enrollmentId: row.enrollmentId ?? null,
      startsAt,
    };
  }

  private async requireStudent(user: User) {
    if (String(user.role).toUpperCase() !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can schedule classes');
    }
    const student = await this.studentService.findByUserId(user.id);
    if (!student) {
      throw new ForbiddenException('Student profile not found');
    }
    return student;
  }

  private async emitClassBooked(params: {
    studentUserId: number;
    tutorUserId?: number | null;
    studentName: string;
    tutorName: string;
    offeringName: string;
    startsAt: Date;
    durationMinutes: number;
    sessionId: number;
  }): Promise<void> {
    const classTime = `${formatIstBookingDateLabel(params.startsAt)} ${formatIstBookingTimeRange(params.startsAt, params.durationMinutes)}`;
    const payload = {
      tutorName: params.tutorName,
      studentName: params.studentName,
      offeringName: params.offeringName,
      classTime,
    };
    try {
      await this.communicationService.emit({
        event: CommunicationEvent.CLASS_BOOKED,
        userId: params.studentUserId,
        audience: CommunicationAudience.STUDENT,
        entityType: 'class_session',
        entityId: params.sessionId,
        payload,
      });
      if (params.tutorUserId) {
        await this.communicationService.emit({
          event: CommunicationEvent.CLASS_BOOKED,
          userId: params.tutorUserId,
          audience: CommunicationAudience.TUTOR,
          entityType: 'class_session',
          entityId: params.sessionId,
          payload,
        });
      }
    } catch (error) {
      this.logger.warn(
        `CLASS_BOOKED emit failed for session ${params.sessionId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
