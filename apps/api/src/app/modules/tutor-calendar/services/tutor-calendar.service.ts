import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  isRateCardComplete,
  RATE_CARD_REQUIRED_MESSAGE,
  SLOT_DURATION_MINUTES,
  validateSlotInstant,
} from '@tutorix/shared-utils';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import { SaveMyTutorCalendarInput } from '../dto/save-my-tutor-calendar.input';
import { TutorCalendar } from '../entities/tutor-calendar.entity';

@Injectable()
export class TutorCalendarService {
  constructor(
    @InjectRepository(TutorCalendar)
    private readonly calendarRepo: Repository<TutorCalendar>,
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

    const existing = await this.calendarRepo
      .createQueryBuilder('c')
      .where('c.tutorId = :tutorId', { tutorId: tutor.id })
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
        where: { tutorId: tutor.id, startsAt, deleted: true },
      });
      if (revived) {
        revived.deleted = false;
        revived.durationMinutes = SLOT_DURATION_MINUTES;
        await this.calendarRepo.save(revived);
        continue;
      }
      await this.calendarRepo.save(
        this.calendarRepo.create({
          tutorId: tutor.id,
          startsAt,
          durationMinutes: SLOT_DURATION_MINUTES,
        }),
      );
    }

    if (normalizedStarts.length > 0 && !tutor.availabilityConfiguredAt) {
      tutor.availabilityConfiguredAt = new Date();
      await this.tutorRepo.save(tutor);
    }

    return this.findForTutorInRange(tutor.id, rangeStart, rangeEnd);
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
