import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  formatDailyGridRangeLabel,
  isOnDailyGrid,
  isRateCardComplete,
  defaultWeeklyUnavailableKeys,
  materializedAvailableSlotStarts,
  unavailableKeysFromBlocks,
  unavailableKeysToBlocks,
  maxHorizonEndUtc,
  RATE_CARD_REQUIRED_MESSAGE,
  SLOT_DURATION_MINUTES,
  validateSlotInstant,
} from '@tutorix/shared-utils';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import { SaveMyTutorCalendarInput } from '../dto/save-my-tutor-calendar.input';
import {
  SaveMyWeeklyUnavailabilityInput,
  SaveMyWeeklyUnavailabilityResult,
  WeeklyUnavailabilitySlot,
} from '../dto/weekly-unavailability.dto';
import { TutorCalendar } from '../entities/tutor-calendar.entity';
import { TutorWeeklyUnavailability } from '../entities/tutor-weekly-unavailability.entity';

@Injectable()
export class TutorCalendarService {
  constructor(
    @InjectRepository(TutorCalendar)
    private readonly calendarRepo: Repository<TutorCalendar>,
    @InjectRepository(TutorWeeklyUnavailability)
    private readonly weeklyRepo: Repository<TutorWeeklyUnavailability>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
    @InjectRepository(TutorOfferingEntity)
    private readonly tutorOfferingRepo: Repository<TutorOfferingEntity>,
    private readonly tutorRateCardService: TutorRateCardService,
  ) {}

  async assertCanSetCalendar(tutorId: number): Promise<void> {
    const canSet = await this.tutorHasCompleteRateCard(tutorId);
    if (!canSet) {
      throw new BadRequestException(RATE_CARD_REQUIRED_MESSAGE);
    }
  }

  async tutorHasCompleteRateCard(tutorId: number): Promise<boolean> {
    const offerings = await this.tutorOfferingRepo.find({
      where: { tutorId, deleted: false },
    });
    if (offerings.length === 0) {
      return false;
    }
    const rateCards = await this.tutorRateCardService.findByTutorOfferingIds(
      offerings.map((o) => o.id),
    );
    for (const offering of offerings) {
      const entity = rateCards.get(offering.id);
      if (isRateCardComplete(entity)) {
        return true;
      }
    }
    return false;
  }

  async findForTutorInRange(
    tutorId: number,
    from: Date,
    to: Date,
  ): Promise<TutorCalendar[]> {
    return this.calendarRepo
      .createQueryBuilder('c')
      .where('c.tutorId = :tutorId', { tutorId })
      .andWhere('c.deleted = false')
      .andWhere('c.startsAt >= :from', { from })
      .andWhere('c.startsAt < :to', { to })
      .orderBy('c.startsAt', 'ASC')
      .getMany();
  }

  async getMyCalendar(
    userId: number,
    from: Date,
    to: Date,
  ): Promise<TutorCalendar[]> {
    const tutor = await this.requireTutorForUser(userId);
    await this.assertCanSetCalendar(tutor.id);
    if (to <= from) {
      throw new BadRequestException('Invalid date range');
    }
    return this.findForTutorInRange(tutor.id, from, to);
  }

  async getLatestAvailabilityStartForTutor(
    userId: number,
  ): Promise<Date | null> {
    const tutor = await this.requireTutorForUser(userId);
    await this.assertCanSetCalendar(tutor.id);
    return this.getLatestSlotStartForTutor(tutor.id);
  }

  async getAdminCalendar(
    tutorId: number,
    from: Date,
    to: Date,
  ): Promise<TutorCalendar[]> {
    await this.requireTutorById(tutorId);
    if (to <= from) {
      throw new BadRequestException('Invalid date range');
    }
    return this.findForTutorInRange(tutorId, from, to);
  }

  async getAdminCalendarUpdatedTill(tutorId: number): Promise<Date | null> {
    await this.requireTutorById(tutorId);
    return this.getLatestSlotStartForTutor(tutorId);
  }

  private async getLatestSlotStartForTutor(
    tutorId: number,
  ): Promise<Date | null> {
    const row = await this.calendarRepo
      .createQueryBuilder('c')
      .select('MAX(c.startsAt)', 'maxStartsAt')
      .where('c.tutorId = :tutorId', { tutorId })
      .andWhere('c.deleted = false')
      .getRawOne<{ maxStartsAt: Date | string | null }>();
    if (row?.maxStartsAt == null) return null;
    const max = new Date(row.maxStartsAt);
    return Number.isNaN(max.getTime()) ? null : max;
  }

  async getMyWeeklyUnavailability(userId: number): Promise<WeeklyUnavailabilitySlot[]> {
    const tutor = await this.requireTutorForUser(userId);
    await this.assertCanSetCalendar(tutor.id);
    const rows = await this.weeklyRepo.find({
      where: { tutorId: tutor.id, deleted: false },
      order: { istDayOfWeek: 'ASC', startHour: 'ASC', startMinute: 'ASC' },
    });
    if (rows.length === 0 && tutor.availabilityConfiguredAt == null) {
      return unavailableKeysToBlocks(defaultWeeklyUnavailableKeys());
    }
    return rows.map((row) => ({
      dayOfWeek: row.istDayOfWeek,
      hour: row.startHour,
      minute: row.startMinute,
    }));
  }

  async saveMyWeeklyUnavailability(
    userId: number,
    input: SaveMyWeeklyUnavailabilityInput,
  ): Promise<SaveMyWeeklyUnavailabilityResult> {
    const tutor = await this.requireTutorForUser(userId);
    await this.assertCanSetCalendar(tutor.id);

    const normalized = this.normalizeWeeklyBlocks(input.unavailableSlots ?? []);
    const now = new Date();

    const existing = await this.weeklyRepo.find({
      where: { tutorId: tutor.id, deleted: false },
    });
    const desired = new Set(
      normalized.map(
        (b) => `${b.dayOfWeek}-${b.hour}-${b.minute}`,
      ),
    );
    for (const row of existing) {
      const key = `${row.istDayOfWeek}-${row.startHour}-${row.startMinute}`;
      if (!desired.has(key)) {
        row.deleted = true;
        await this.weeklyRepo.save(row);
      }
    }
    for (const block of normalized) {
      const found = existing.find(
        (row) =>
          !row.deleted &&
          row.istDayOfWeek === block.dayOfWeek &&
          row.startHour === block.hour &&
          row.startMinute === block.minute,
      );
      if (found) continue;
      const revived = await this.weeklyRepo.findOne({
        where: {
          tutorId: tutor.id,
          istDayOfWeek: block.dayOfWeek,
          startHour: block.hour,
          startMinute: block.minute,
          deleted: true,
        },
      });
      if (revived) {
        revived.deleted = false;
        await this.weeklyRepo.save(revived);
        continue;
      }
      await this.weeklyRepo.save(
        this.weeklyRepo.create({
          tutorId: tutor.id,
          istDayOfWeek: block.dayOfWeek,
          startHour: block.hour,
          startMinute: block.minute,
        }),
      );
    }

    const unavailableKeys = unavailableKeysFromBlocks(normalized);
    const slotStarts = materializedAvailableSlotStarts(unavailableKeys, now);
    const rangeStart = now;
    const rangeEnd = maxHorizonEndUtc(now);
    await this.syncCalendarSlots(tutor.id, rangeStart, rangeEnd, slotStarts);

    if (!tutor.availabilityConfiguredAt) {
      tutor.availabilityConfiguredAt = new Date();
    }
    await this.tutorRepo.save(tutor);

    const materializedThrough = await this.getLatestSlotStartForTutor(tutor.id);

    return {
      unavailableSlots: normalized,
      materializedThrough: materializedThrough ?? undefined,
      availabilityConfiguredAt: tutor.availabilityConfiguredAt,
    };
  }

  async saveMyCalendar(
    userId: number,
    input: SaveMyTutorCalendarInput,
  ): Promise<TutorCalendar[]> {
    const tutor = await this.requireTutorForUser(userId);
    await this.assertCanSetCalendar(tutor.id);

    const { rangeStart, rangeEnd } = input;
    if (rangeEnd <= rangeStart) {
      throw new BadRequestException('rangeEnd must be after rangeStart');
    }

    const now = new Date();
    const normalizedStarts: Date[] = [];
    const seen = new Set<string>();
    for (const raw of input.slotStarts) {
      const startsAt = new Date(raw);
      const validation = validateSlotInstant(startsAt, now);
      if (validation.ok === false) {
        throw new BadRequestException(validation.message);
      }
      if (startsAt < rangeStart || startsAt >= rangeEnd) {
        throw new BadRequestException(
          'All slot starts must fall within rangeStart and rangeEnd',
        );
      }
      const key = startsAt.toISOString();
      if (seen.has(key)) continue;
      seen.add(key);
      normalizedStarts.push(startsAt);
    }

    await this.syncCalendarSlots(
      tutor.id,
      rangeStart,
      rangeEnd,
      normalizedStarts,
    );

    if (normalizedStarts.length > 0 && !tutor.availabilityConfiguredAt) {
      tutor.availabilityConfiguredAt = new Date();
      await this.tutorRepo.save(tutor);
    }

    return this.findForTutorInRange(tutor.id, rangeStart, rangeEnd);
  }

  private normalizeWeeklyBlocks(
    slots: WeeklyUnavailabilitySlot[],
  ): WeeklyUnavailabilitySlot[] {
    const seen = new Set<string>();
    const out: WeeklyUnavailabilitySlot[] = [];
    for (const raw of slots) {
      const dayOfWeek = Number(raw.dayOfWeek);
      const hour = Number(raw.hour);
      const minute = Number(raw.minute);
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        throw new BadRequestException('dayOfWeek must be 0 (Sun) through 6 (Sat)');
      }
      if (!isOnDailyGrid(hour, minute)) {
        throw new BadRequestException(
          `Unavailable slots must align to the 30-minute teaching grid (${formatDailyGridRangeLabel()}).`,
        );
      }
      const key = `${dayOfWeek}-${hour}-${minute}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ dayOfWeek, hour, minute });
    }
    return out;
  }

  private async syncCalendarSlots(
    tutorId: number,
    rangeStart: Date,
    rangeEnd: Date,
    normalizedStarts: Date[],
  ): Promise<void> {
    const existing = await this.calendarRepo
      .createQueryBuilder('c')
      .where('c.tutorId = :tutorId', { tutorId })
      .andWhere('c.deleted = false')
      .andWhere('c.startsAt >= :rangeStart', { rangeStart })
      .andWhere('c.startsAt < :rangeEnd', { rangeEnd })
      .getMany();

    const desiredKeys = new Set(normalizedStarts.map((d) => d.toISOString()));
    const toSoftDelete = existing.filter(
      (row) => !desiredKeys.has(row.startsAt.toISOString()),
    );
    if (toSoftDelete.length > 0) {
      for (const row of toSoftDelete) {
        row.deleted = true;
      }
      await this.calendarRepo.save(toSoftDelete);
    }

    const existingKeys = new Set(
      existing
        .filter((row) => desiredKeys.has(row.startsAt.toISOString()))
        .map((row) => row.startsAt.toISOString()),
    );

    const toInsert = normalizedStarts.filter(
      (d) => !existingKeys.has(d.toISOString()),
    );
    for (const startsAt of toInsert) {
      const revived = await this.calendarRepo.findOne({
        where: { tutorId, startsAt, deleted: true },
      });
      if (revived) {
        revived.deleted = false;
        revived.durationMinutes = SLOT_DURATION_MINUTES;
        await this.calendarRepo.save(revived);
        continue;
      }
      await this.calendarRepo.save(
        this.calendarRepo.create({
          tutorId,
          startsAt,
          durationMinutes: SLOT_DURATION_MINUTES,
        }),
      );
    }
  }

  private async requireTutorById(tutorId: number): Promise<Tutor> {
    const tutor = await this.tutorRepo.findOne({
      where: { id: tutorId, deleted: false },
    });
    if (!tutor) {
      throw new NotFoundException('Tutor not found');
    }
    return tutor;
  }

  private async requireTutorForUser(userId: number): Promise<Tutor> {
    const tutor = await this.tutorRepo.findOne({
      where: { userId, deleted: false },
    });
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found for this user');
    }
    if (!tutor.onBoardingComplete || !tutor.onboardingCelebrationSeen) {
      throw new ForbiddenException(
        'Calendar is available after onboarding is complete',
      );
    }
    return tutor;
  }
}
