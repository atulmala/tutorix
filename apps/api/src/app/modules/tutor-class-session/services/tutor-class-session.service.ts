import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, DataSource, In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import {
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
  getBatchSizeForMode,
  maxHorizonEndUtc,
} from '@tutorix/shared-utils';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { CommunicationAudience } from '../../communication/enums/communication-audience.enum';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { CommunicationService } from '../../communication/communication.service';
import { ProficiencyTestService } from '../../proficiency/services/proficiency-test.service';
import { StudentService } from '../../student/services/student.service';
import { TutorCalendar } from '../../tutor-calendar/entities/tutor-calendar.entity';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { TutorOfferingStatusEnum } from '../../tutor/enums/tutor.enums';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import { WalletService } from '../../wallet/services/wallet.service';
import {
  BookTutorClassResult,
  StudentBookedClassSession,
  TutorBookableSlot,
} from '../dto/tutor-class-session.dto';
import { TutorClassSessionEnrollmentEntity } from '../entities/tutor-class-session-enrollment.entity';
import { TutorClassSessionEntity } from '../entities/tutor-class-session.entity';
import { ClassSessionDeliveryModeEnum } from '../enums/class-session-delivery-mode.enum';
import { ClassSessionEnrollmentStatusEnum } from '../enums/class-session-enrollment-status.enum';
import { ClassSessionStatusEnum } from '../enums/class-session-status.enum';

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

function confirmedCount(
  enrollments: TutorClassSessionEnrollmentEntity[] | undefined,
): number {
  return (enrollments ?? []).filter(
    (row) =>
      !row.deleted && row.status === ClassSessionEnrollmentStatusEnum.confirmed,
  ).length;
}

@Injectable()
export class TutorClassSessionService {
  private readonly logger = new Logger(TutorClassSessionService.name);

  constructor(
    private readonly studentService: StudentService,
    private readonly rateCardService: TutorRateCardService,
    private readonly proficiencyTestService: ProficiencyTestService,
    private readonly walletService: WalletService,
    private readonly communicationService: CommunicationService,
    private readonly dataSource: DataSource,
    @InjectRepository(TutorCalendar)
    private readonly calendarRepo: Repository<TutorCalendar>,
    @InjectRepository(TutorOfferingEntity)
    private readonly tutorOfferingRepo: Repository<TutorOfferingEntity>,
    @InjectRepository(TutorClassSessionEntity)
    private readonly sessionRepo: Repository<TutorClassSessionEntity>,
    @InjectRepository(TutorClassSessionEnrollmentEntity)
    private readonly enrollmentRepo: Repository<TutorClassSessionEnrollmentEntity>,
  ) {}

  async listBookableSlots(
    user: User,
    tutorIdInput: string | number,
    offeringIdInput: string | number,
    deliveryMode: ClassSessionDeliveryModeEnum,
    from: Date,
    to: Date,
  ): Promise<TutorBookableSlot[]> {
    this.assertStudent(user);
    const student = await this.requireStudent(user.id);
    const tutorId = asId(tutorIdInput);
    const offeringId = asId(offeringIdInput);
    const tutorOffering = await this.resolveTutorOffering(tutorId, offeringId);
    const rateCard = await this.requireRateCard(tutorOffering.id, deliveryMode);
    const rateBatchSize = getBatchSizeForMode(rateCard, deliveryMode);

    const now = new Date();
    const rangeFrom = from > now ? from : now;
    const horizon = maxHorizonEndUtc(now);
    const rangeTo = to < horizon ? to : horizon;
    if (!(rangeFrom < rangeTo)) {
      return [];
    }

    const slots = await this.calendarRepo.find({
      where: {
        tutorId,
        deleted: false,
        startsAt: And(MoreThanOrEqual(rangeFrom), LessThan(rangeTo)),
      },
      order: { startsAt: 'ASC' },
    });
    if (slots.length === 0) {
      return [];
    }

    const sessions = await this.sessionRepo.find({
      where: {
        tutorCalendarId: In(slots.map((slot) => slot.id)),
        deleted: false,
      },
      relations: ['enrollments'],
    });
    const sessionByCalendarId = new Map(
      sessions.map((session) => [session.tutorCalendarId, session]),
    );

    const bookable: TutorBookableSlot[] = [];
    for (const slot of slots) {
      const session = sessionByCalendarId.get(slot.id);
      if (!session) {
        bookable.push({
          tutorCalendarId: slot.id,
          startsAt: slot.startsAt,
          seatsLeft: rateBatchSize,
          batchSize: rateBatchSize,
        });
        continue;
      }
      if (
        session.status === ClassSessionStatusEnum.cancelled ||
        session.tutorOfferingId !== tutorOffering.id ||
        session.deliveryMode !== deliveryMode
      ) {
        continue;
      }
      const confirmed = confirmedCount(session.enrollments);
      const alreadyBooked = (session.enrollments ?? []).some(
        (row) =>
          !row.deleted &&
          row.studentId === student.id &&
          row.status === ClassSessionEnrollmentStatusEnum.confirmed,
      );
      if (alreadyBooked || confirmed >= session.batchSize) {
        continue;
      }
      bookable.push({
        tutorCalendarId: slot.id,
        startsAt: slot.startsAt,
        seatsLeft: session.batchSize - confirmed,
        batchSize: session.batchSize,
      });
    }
    return bookable;
  }

  async bookTutorClass(
    _user: User,
    _tutorCalendarIdInput: string | number,
    _offeringIdInput: string | number,
    _deliveryMode: ClassSessionDeliveryModeEnum,
  ): Promise<BookTutorClassResult> {
    throw new BadRequestException(
      'Direct class booking is no longer supported. Add classes to your cart from the tutor profile, pay at checkout, then schedule your class credits.',
    );
  }

  async listBookedSessions(
    user: User,
    from: Date,
    to: Date,
  ): Promise<StudentBookedClassSession[]> {
    this.assertStudent(user);
    const student = await this.requireStudent(user.id);
    if (!(from < to)) {
      return [];
    }

    const enrollments = await this.enrollmentRepo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.session', 's')
      .innerJoinAndSelect('s.tutorCalendar', 'c')
      .innerJoinAndSelect('s.tutorOffering', 'toffer')
      .leftJoinAndSelect('toffer.offering', 'o')
      .leftJoinAndSelect('toffer.tutor', 't')
      .leftJoinAndSelect('t.user', 'u')
      .where('e.student_id = :studentId', { studentId: student.id })
      .andWhere('e.deleted = false')
      .andWhere('e.status = :enrolled', {
        enrolled: ClassSessionEnrollmentStatusEnum.confirmed,
      })
      .andWhere('s.deleted = false')
      .andWhere('s.status != :cancelled', {
        cancelled: ClassSessionStatusEnum.cancelled,
      })
      .andWhere('c.startsAt >= :from', { from })
      .andWhere('c.startsAt < :to', { to })
      .orderBy('c.startsAt', 'ASC')
      .getMany();

    return enrollments.map((row) => {
      const session = row.session as TutorClassSessionEntity;
      const calendar = session.tutorCalendar as TutorCalendar;
      return {
        enrollmentId: row.id,
        sessionId: session.id,
        tutorCalendarId: calendar.id,
        startsAt: calendar.startsAt,
        durationMinutes: calendar.durationMinutes ?? 60,
        deliveryMode: session.deliveryMode,
        offeringLabel: session.tutorOffering?.offering?.displayName ?? 'Class',
        tutorName: personName(session.tutorOffering?.tutor?.user) || 'Tutor',
      };
    });
  }

  private async resolveTutorOfferingFromSlot(
    tutorCalendarId: number,
    offeringId: number,
  ): Promise<TutorOfferingEntity> {
    const slot = await this.calendarRepo.findOne({
      where: { id: tutorCalendarId, deleted: false },
    });
    if (!slot) {
      throw new NotFoundException('This slot is no longer available');
    }
    return this.resolveTutorOffering(slot.tutorId, offeringId);
  }

  private async resolveTutorOffering(
    tutorId: number,
    offeringId: number,
  ): Promise<TutorOfferingEntity> {
    const relations = ['tutor', 'tutor.user', 'offering'] as const;
    const exact = await this.tutorOfferingRepo.findOne({
      where: {
        tutorId,
        offeringId,
        status: TutorOfferingStatusEnum.pt_passed,
        deleted: false,
      },
      relations: [...relations],
    });
    if (this.isEligibleTutorOffering(exact)) {
      return exact;
    }

    const coveringTest =
      await this.proficiencyTestService.findActiveTestForOffering(offeringId);
    if (coveringTest) {
      const covered = await this.tutorOfferingRepo.findOne({
        where: {
          tutorId,
          proficiencyTestId: coveringTest.id,
          status: TutorOfferingStatusEnum.pt_passed,
          deleted: false,
        },
        relations: [...relations],
      });
      if (this.isEligibleTutorOffering(covered)) {
        return covered;
      }
    }

    throw new NotFoundException('Tutor offering not found');
  }

  private isEligibleTutorOffering(
    row: TutorOfferingEntity | null,
  ): row is TutorOfferingEntity {
    return Boolean(
      row &&
        row.tutor &&
        !row.tutor.deleted &&
        row.tutor.onBoardingComplete === true,
    );
  }

  private async requireRateCard(
    tutorOfferingId: number,
    deliveryMode: ClassSessionDeliveryModeEnum,
  ) {
    const rateCard =
      await this.rateCardService.findByTutorOfferingId(tutorOfferingId);
    const enabled =
      deliveryMode === ClassSessionDeliveryModeEnum.offline
        ? rateCard?.offlineEnabled === true
        : rateCard?.onlineEnabled === true;
    if (!rateCard || !enabled) {
      throw new BadRequestException(
        'This delivery mode is not available for this offering',
      );
    }
    return rateCard;
  }

  private async requireStudent(userId: number) {
    const student = await this.studentService.findByUserId(userId);
    if (!student) {
      throw new ForbiddenException('Student profile not found');
    }
    return student;
  }

  private assertStudent(user: User): void {
    if (String(user.role).toUpperCase() !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can book classes');
    }
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
