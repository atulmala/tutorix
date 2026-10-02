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
  canScheduleClassAt,
  earliestClassStart,
  getBatchSizeForMode,
  maxHorizonEndUtc,
} from '@tutorix/shared-utils';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { StudentClassCreditEntity } from '../../student-cart/entities/student-class-credit.entity';
import { Student } from '../../student/entities/student.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
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
  TutorBookedClassSession,
} from '../dto/tutor-class-session.dto';
import { TutorClassSessionEnrollmentEntity } from '../entities/tutor-class-session-enrollment.entity';
import { TutorClassSessionEntity } from '../entities/tutor-class-session.entity';
import { ClassSessionDeliveryModeEnum } from '../enums/class-session-delivery-mode.enum';
import { ClassSessionEnrollmentStatusEnum } from '../enums/class-session-enrollment-status.enum';
import { ClassSessionStatusEnum } from '../enums/class-session-status.enum';
import { classWindowsOverlap } from '../student-slot-conflict.util';

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
    const earliest = earliestClassStart(now);
    const rangeFrom = from > earliest ? from : earliest;
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
    const busy = await this.studentBusyWindows(student.id, rangeFrom, rangeTo);

    const bookable: TutorBookableSlot[] = [];
    for (const slot of slots) {
      if (!canScheduleClassAt(slot.startsAt, now)) {
        continue;
      }
      const duration = slot.durationMinutes ?? 60;
      if (
        busy.some((window) =>
          classWindowsOverlap(
            window.startsAt,
            window.durationMinutes,
            slot.startsAt,
            duration,
          ),
        )
      ) {
        continue;
      }
      const session = sessionByCalendarId.get(slot.id);
      if (!session || session.status === ClassSessionStatusEnum.cancelled) {
        bookable.push({
          tutorCalendarId: slot.id,
          startsAt: slot.startsAt,
          seatsLeft: rateBatchSize,
          batchSize: rateBatchSize,
        });
        continue;
      }
      const sameOffering = Number(session.tutorOfferingId) === Number(tutorOffering.id);
      const sameMode = session.deliveryMode === deliveryMode;
      // An online booking blocks that hour for offline (and for any other offering).
      // The same offering can keep filling the online batch up to the rate-card size.
      if (!sameOffering || !sameMode) {
        continue;
      }
      const confirmed = confirmedCount(session.enrollments);
      const alreadyBooked = (session.enrollments ?? []).some(
        (row) =>
          !row.deleted &&
          row.studentId === student.id &&
          row.status === ClassSessionEnrollmentStatusEnum.confirmed,
      );
      if (alreadyBooked || confirmed >= rateBatchSize) {
        continue;
      }
      bookable.push({
        tutorCalendarId: slot.id,
        startsAt: slot.startsAt,
        seatsLeft: rateBatchSize - confirmed,
        batchSize: rateBatchSize,
      });
    }
    return bookable;
  }

  /** Confirmed classes this student already holds in the window, including with other tutors. */
  private async studentBusyWindows(
    studentId: number,
    rangeFrom: Date,
    rangeTo: Date,
  ): Promise<Array<{ startsAt: Date; durationMinutes: number }>> {
    const windowFrom = new Date(rangeFrom.getTime() - 60 * 60_000);
    const rows = await this.enrollmentRepo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.session', 's')
      .innerJoinAndSelect('s.tutorCalendar', 'c')
      .where('e.student_id = :studentId', { studentId })
      .andWhere('e.deleted = false')
      .andWhere('e.status = :confirmed', {
        confirmed: ClassSessionEnrollmentStatusEnum.confirmed,
      })
      .andWhere('s.deleted = false')
      .andWhere('s.status != :cancelled', {
        cancelled: ClassSessionStatusEnum.cancelled,
      })
      .andWhere('c.deleted = false')
      .andWhere('c.startsAt < :rangeTo', { rangeTo })
      .andWhere('c.startsAt >= :windowFrom', { windowFrom })
      .getMany();

    return rows.flatMap((row) => {
      const calendar = row.session?.tutorCalendar;
      if (!calendar?.startsAt) {
        return [];
      }
      return [
        {
          startsAt: calendar.startsAt,
          durationMinutes: calendar.durationMinutes ?? 60,
        },
      ];
    });
  }

  async listTutorBookedSessions(
    user: User,
    from: Date,
    to: Date,
  ): Promise<TutorBookedClassSession[]> {
    this.assertTutor(user);
    const tutor = await this.dataSource.getRepository(Tutor).findOne({
      where: { userId: user.id, deleted: false },
    });
    if (!tutor) {
      throw new ForbiddenException('Tutor profile not found');
    }
    if (!(from < to)) {
      return [];
    }

    const enrollments = await this.enrollmentRepo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.session', 's')
      .innerJoinAndSelect('s.tutorCalendar', 'c')
      .innerJoinAndSelect('s.tutorOffering', 'toffer')
      .leftJoinAndSelect('toffer.offering', 'o')
      .innerJoinAndMapOne(
        'e.bookedStudent',
        Student,
        'student',
        'student.id = e.student_id',
      )
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndMapOne(
        'e.classCredit',
        StudentClassCreditEntity,
        'credit',
        'credit.enrollment_id = e.id AND credit.deleted = false',
      )
      .where('c.tutorId = :tutorId', { tutorId: tutor.id })
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
      const booked = row as TutorClassSessionEnrollmentEntity & {
        bookedStudent?: Student;
        classCredit?: StudentClassCreditEntity | null;
      };
      const session = booked.session as TutorClassSessionEntity;
      const calendar = session.tutorCalendar as TutorCalendar;
      return {
        enrollmentId: booked.id,
        sessionId: session.id,
        tutorCalendarId: calendar.id,
        startsAt: calendar.startsAt,
        durationMinutes: calendar.durationMinutes ?? 60,
        deliveryMode: session.deliveryMode,
        offeringLabel: session.tutorOffering?.offering?.displayName ?? 'Class',
        studentName: personName(booked.bookedStudent?.user) || 'Student',
        isDemo: booked.classCredit?.isDemo === true,
      };
    });
  }

  async bookTutorClass(
    user: User,
    tutorCalendarIdInput: string | number,
    offeringIdInput: string | number,
    deliveryMode: ClassSessionDeliveryModeEnum,
  ): Promise<BookTutorClassResult> {
    void user;
    void tutorCalendarIdInput;
    void offeringIdInput;
    void deliveryMode;
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

  private assertTutor(user: User): void {
    if (String(user.role).toUpperCase() !== UserRole.TUTOR) {
      throw new ForbiddenException('Only tutors can view this schedule');
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
