import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
} from '@tutorix/shared-utils';
import { CommunicationAudience } from '../../communication/enums/communication-audience.enum';
import { CommunicationChannel } from '../../communication/enums/communication-channel.enum';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { CommunicationService } from '../../communication/communication.service';
import {
  buildTutorBookingBatchTable,
  buildTutorScheduleBatchTable,
  formatInrAmount,
} from '../class-booking-email-table.util';
import { TutorClassEmailQueueEntity } from '../entities/tutor-class-email-queue.entity';

export type TutorBookingEmailItem = {
  tutorUserId: number;
  tutorName: string;
  studentName: string;
  offeringLabel: string;
  deliveryMode: string;
  classCount: number;
  amountInr: number;
  isDemo?: boolean;
  sourceKey: string;
};

export type TutorScheduleEmailItem = {
  tutorUserId: number;
  tutorName: string;
  studentName: string;
  offeringLabel: string;
  deliveryMode: string;
  startsAt: Date;
  durationMinutes: number;
  enrollmentId: number;
};

@Injectable()
export class TutorClassEmailBatchService {
  private readonly logger = new Logger(TutorClassEmailBatchService.name);

  constructor(
    @InjectRepository(TutorClassEmailQueueEntity)
    private readonly queueRepo: Repository<TutorClassEmailQueueEntity>,
    private readonly communicationService: CommunicationService,
  ) {}

  async enqueueBookings(items: TutorBookingEmailItem[]): Promise<void> {
    for (const item of items) {
      if (!item.tutorUserId) {
        continue;
      }
      const existing = await this.queueRepo.findOne({
        where: { sourceKey: item.sourceKey, deleted: false },
      });
      if (existing) {
        continue;
      }
      await this.queueRepo.save(
        this.queueRepo.create({
          tutorUserId: item.tutorUserId,
          tutorName: item.tutorName,
          kind: 'booking',
          studentName: item.studentName,
          offeringLabel: item.offeringLabel,
          deliveryMode: item.deliveryMode,
          classCount: item.classCount,
          amountInr: item.amountInr,
          isDemo: item.isDemo === true,
          startsAt: null,
          durationMinutes: null,
          enrollmentId: null,
          sourceKey: item.sourceKey,
          sentAt: null,
        }),
      );
    }
  }

  /** Keeps one unsent row per enrollment so a reschedule replaces the pending slot. */
  async enqueueSchedule(item: TutorScheduleEmailItem): Promise<void> {
    if (!item.tutorUserId) {
      return;
    }
    const sourceKey = `scheduling:${item.enrollmentId}`;
    const pending = await this.queueRepo.findOne({
      where: {
        sourceKey,
        sentAt: IsNull(),
        deleted: false,
      },
    });
    if (pending) {
      pending.tutorUserId = item.tutorUserId;
      pending.tutorName = item.tutorName;
      pending.studentName = item.studentName;
      pending.offeringLabel = item.offeringLabel;
      pending.deliveryMode = item.deliveryMode;
      pending.startsAt = item.startsAt;
      pending.durationMinutes = item.durationMinutes;
      pending.enrollmentId = item.enrollmentId;
      await this.queueRepo.save(pending);
      return;
    }
    await this.queueRepo.save(
      this.queueRepo.create({
        tutorUserId: item.tutorUserId,
        tutorName: item.tutorName,
        kind: 'scheduling',
        studentName: item.studentName,
        offeringLabel: item.offeringLabel,
        deliveryMode: item.deliveryMode,
        classCount: null,
        amountInr: null,
        isDemo: false,
        startsAt: item.startsAt,
        durationMinutes: item.durationMinutes,
        enrollmentId: item.enrollmentId,
        sourceKey,
        sentAt: null,
      }),
    );
  }

  /** Sends one booking email and one scheduling email per tutor for queued rows. */
  async sendHourlyBatch(): Promise<void> {
    const pending = await this.queueRepo.find({
      where: { sentAt: IsNull(), deleted: false },
      order: { createdDate: 'ASC' },
    });
    const byTutor = new Map<number, TutorClassEmailQueueEntity[]>();
    for (const row of pending) {
      const tutorUserId = Number(row.tutorUserId);
      const group = byTutor.get(tutorUserId) ?? [];
      group.push(row);
      byTutor.set(tutorUserId, group);
    }

    for (const [tutorUserId, rows] of byTutor) {
      const bookings = rows.filter((row) => row.kind === 'booking');
      const schedules = rows
        .filter(isScheduledEmailRow)
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      const tutorName = rows[0]?.tutorName || 'Tutor';
      if (bookings.length > 0) {
        await this.sendBookingEmail(tutorUserId, tutorName, bookings);
      }
      if (schedules.length > 0) {
        await this.sendScheduleEmail(tutorUserId, tutorName, schedules);
      }
    }
  }

  private async sendBookingEmail(
    tutorUserId: number,
    tutorName: string,
    rows: TutorClassEmailQueueEntity[],
  ): Promise<void> {
    const table = buildTutorBookingBatchTable(
      rows.map((row) => ({
        offeringLabel: row.offeringLabel,
        studentName: row.studentName,
        classCount: row.classCount ?? 0,
        deliveryMode: row.deliveryMode,
        amountInr: row.amountInr ?? 0,
        isDemo: row.isDemo === true,
      })),
    );
    const classCount = rows.reduce((sum, row) => sum + (row.classCount ?? 0), 0);
    try {
      await this.communicationService.emit({
        event: CommunicationEvent.CLASS_BOOKED,
        userId: tutorUserId,
        audience: CommunicationAudience.TUTOR,
        entityType: 'tutor_class_email_batch',
        entityId: batchEntityId(rows),
        onlyChannels: [CommunicationChannel.EMAIL],
        payload: {
          tutorName,
          studentName: rows.length === 1 ? rows[0].studentName : 'your students',
          classCount: String(classCount),
          amountPaid: formatInrAmount(table.totalInr),
          linesHtml: table.html,
          linesText: table.text,
        },
      });
      await this.markSent(rows);
    } catch (error) {
      this.logger.warn(
        `Tutor booking batch email failed for user ${tutorUserId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async sendScheduleEmail(
    tutorUserId: number,
    tutorName: string,
    rows: ScheduledEmailRow[],
  ): Promise<void> {
    const table = buildTutorScheduleBatchTable(
      rows.map((row) => ({
        studentName: row.studentName,
        offeringLabel: row.offeringLabel,
        deliveryMode: row.deliveryMode,
        classTime: `${formatIstBookingDateLabel(row.startsAt)} ${formatIstBookingTimeRange(
          row.startsAt,
          row.durationMinutes ?? 60,
        )}`,
      })),
    );
    try {
      await this.communicationService.emit({
        event: CommunicationEvent.CLASS_SCHEDULED,
        userId: tutorUserId,
        audience: CommunicationAudience.TUTOR,
        entityType: 'tutor_class_email_batch',
        entityId: batchEntityId(rows),
        onlyChannels: [CommunicationChannel.EMAIL],
        payload: {
          tutorName,
          studentName: rows.length === 1 ? rows[0].studentName : 'your students',
          offeringName: rows.length === 1 ? rows[0].offeringLabel : 'Classes',
          deliveryMode: rows.length === 1 ? rows[0].deliveryMode : '',
          classTime: rows.length === 1 ? formatIstBookingTimeRange(rows[0].startsAt) : '',
          headline: 'Classes scheduled with you',
          linesHtml: table.html,
          linesText: table.text,
        },
      });
      await this.markSent(rows);
    } catch (error) {
      this.logger.warn(
        `Tutor scheduling batch email failed for user ${tutorUserId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async markSent(rows: TutorClassEmailQueueEntity[]): Promise<void> {
    const sentAt = new Date();
    for (const row of rows) {
      row.sentAt = sentAt;
    }
    await this.queueRepo.save(rows);
  }
}

type ScheduledEmailRow = TutorClassEmailQueueEntity & { startsAt: Date };

function isScheduledEmailRow(row: TutorClassEmailQueueEntity): row is ScheduledEmailRow {
  return row.kind === 'scheduling' && row.startsAt instanceof Date;
}

function batchEntityId(rows: TutorClassEmailQueueEntity[]): string {
  const ids = rows
    .map((row) => row.id)
    .sort((a, b) => a - b)
    .join(',');
  return createHash('sha1').update(ids).digest('hex');
}
