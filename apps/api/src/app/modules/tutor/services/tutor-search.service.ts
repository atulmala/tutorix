import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  currentIstWeekRange,
  formatTutorOfferingFullLabel,
  hasUsableCoordinates,
  haversineKm,
  isRateCardComplete,
  MIN_SLOTS_THIS_WEEK,
  paginateHits,
  rankTutorSearchHits,
  starterRateForMode,
  type OfferingNodeForLabel,
  type TutorSearchCandidate,
} from '@tutorix/shared-utils';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { ProfilePictureService } from '../../auth/services/profile-picture.service';
import { AddressType } from '../../address/enums/address-type.enum';
import { AddressEntity } from '../../address/entities/address.entity';
import { OfferingService } from '../../offerings/services/offering.service';
import { OfferingEntity } from '../../offerings/entities/offering.entity';
import { StudentService } from '../../student/services/student.service';
import { TutorCalendar } from '../../tutor-calendar/entities/tutor-calendar.entity';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import { TutorOfferingRateCardEntity } from '../../tutor-rate-card/entities/tutor-offering-rate-card.entity';
import { TutorOfferingEntity } from '../entities/tutor-offering.entity';
import { Tutor } from '../entities/tutor.entity';
import { TutorOfferingStatusEnum } from '../enums/tutor.enums';
import { YearsOfExperienceEnum } from '../enums/years-of-experience.enum';
import {
  TutorSearchClassFormat,
  TutorSearchDeliveryMode,
  TutorSearchSort,
} from '../enums/tutor-search.enum';
import { SearchTutorsInput } from '../dto/search-tutors.input';
import {
  TutorSearchConnection,
  TutorSearchDetail,
  TutorSearchHit,
  TutorSearchOfferingSummary,
} from '../dto/tutor-search.dto';

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_LIMIT = 20;

@Injectable()
export class TutorSearchService {
  constructor(
    private readonly studentService: StudentService,
    @InjectRepository(TutorOfferingEntity)
    private readonly tutorOfferingRepo: Repository<TutorOfferingEntity>,
    @InjectRepository(TutorCalendar)
    private readonly calendarRepo: Repository<TutorCalendar>,
    private readonly rateCardService: TutorRateCardService,
    private readonly offeringService: OfferingService,
    private readonly profilePictureService: ProfilePictureService,
  ) {}

  async searchTutors(
    user: User,
    input: SearchTutorsInput,
  ): Promise<TutorSearchConnection> {
    this.assertStudent(user);
    const offeringId = Number(input.offeringId);
    if (!Number.isFinite(offeringId) || offeringId < 1) {
      throw new NotFoundException('Offering not found');
    }

    const student = await this.studentService.findByUserId(user.id);
    if (!student) {
      throw new ForbiddenException('Student profile not found');
    }

    const origin = this.pickStudentOrigin(student.addresses ?? []);
    const originHasCoordinates = hasUsableCoordinates(
      origin?.latitude,
      origin?.longitude,
    );
    const forcedOnlineOnly = !originHasCoordinates;

    const offerings = await this.tutorOfferingRepo.find({
      where: {
        offeringId,
        status: TutorOfferingStatusEnum.pt_passed,
        deleted: false,
      },
      relations: ['tutor', 'tutor.user', 'tutor.addresses', 'offering'],
    });

    const eligible = offerings.filter(
      (row) =>
        row.status === TutorOfferingStatusEnum.pt_passed &&
        row.tutor &&
        !row.tutor.deleted &&
        row.tutor.onBoardingComplete === true,
    );

    const rateCards = await this.rateCardService.findByTutorOfferingIds(
      eligible.map((row) => row.id),
    );
    const slotCounts = await this.loadSlotsThisWeek(
      eligible.map((row) => row.tutorId),
    );
    const catalog = await this.offeringService.findAll();
    const offeringsById = this.toCatalogMap(catalog);

    const candidates: TutorSearchCandidate[] = [];
    for (const row of eligible) {
      const rateCard = rateCards.get(row.id);
      if (!rateCard || !isRateCardComplete(rateCard)) {
        continue;
      }
      const tutor = row.tutor as Tutor;
      const photoUrl = await this.profilePictureService.resolveDisplayUrl(
        tutor.user?.profilePicture ??
          tutor.user?.profilePictureThumbnailMedium,
      );
      const tutorPoint = this.pickTutorPoint(tutor.addresses ?? []);
      const distanceKm =
        originHasCoordinates && origin
          ? this.distanceKmBetween(origin, tutorPoint)
          : null;
      const leaf = offeringsById.get(row.offeringId) ??
        (row.offering
          ? {
              id: row.offering.id,
              displayName: row.offering.displayName,
              level: row.offering.level,
              parentOffering: row.offering.parentOffering
                ? { id: row.offering.parentOffering.id }
                : undefined,
            }
          : undefined);
      candidates.push({
        tutorId: tutor.id,
        displayName: [tutor.user?.firstName, tutor.user?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || 'Tutor',
        photoUrl,
        yearsOfExperienceRank: Number(tutor.yearsOfExperience) || 1,
        offeringLabel: formatTutorOfferingFullLabel(leaf, offeringsById),
        matchingOfferingId: row.offeringId,
        rateCard,
        distanceKm,
        city: tutorPoint?.city ?? null,
        slotsThisWeek: slotCounts.get(tutor.id) ?? 0,
      });
    }

    const ranked = rankTutorSearchHits(candidates, {
      deliveryMode:
        input.deliveryMode ??
        (forcedOnlineOnly
          ? TutorSearchDeliveryMode.ONLINE
          : TutorSearchDeliveryMode.ANY),
      classFormat: input.classFormat ?? TutorSearchClassFormat.ANY,
      maxRateInr: input.maxRateInr,
      radiusKm: input.radiusKm ?? DEFAULT_RADIUS_KM,
      originHasCoordinates,
      sortBy: input.sortBy ?? TutorSearchSort.BEST_MATCH,
    });

    const page = paginateHits(
      ranked,
      input.cursor,
      input.limit ?? DEFAULT_LIMIT,
    );

    return {
      items: page.items.map((hit) => this.toGraphqlHit(hit, eligible)),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      originHasCoordinates,
      forcedOnlineOnly,
    };
  }

  async getTutorSearchDetail(
    user: User,
    tutorIdRaw: number,
    offeringIdRaw: number,
  ): Promise<TutorSearchDetail> {
    this.assertStudent(user);
    const tutorId = Number(tutorIdRaw);
    const offeringId = Number(offeringIdRaw);
    const student = await this.studentService.findByUserId(user.id);
    if (!student) {
      throw new ForbiddenException('Student profile not found');
    }

    const offerings = await this.tutorOfferingRepo.find({
      where: {
        tutorId,
        status: TutorOfferingStatusEnum.pt_passed,
        deleted: false,
      },
      relations: ['tutor', 'tutor.user', 'tutor.addresses', 'offering'],
    });
    const tutor = offerings[0]?.tutor;
    if (!tutor || tutor.deleted || !tutor.onBoardingComplete) {
      throw new NotFoundException('Tutor not found');
    }

    const matching = offerings.find((row) => row.offeringId === offeringId);
    if (!matching) {
      throw new NotFoundException('Tutor does not teach this subject');
    }

    const rateCards = await this.rateCardService.findByTutorOfferingIds(
      offerings.map((row) => row.id),
    );
    if (!isRateCardComplete(rateCards.get(matching.id))) {
      throw new NotFoundException('Tutor is not available for this subject');
    }

    const catalog = await this.offeringService.findAll();
    const offeringsById = this.toCatalogMap(catalog);
    const slotCounts = await this.loadSlotsThisWeek([tutor.id]);
    const origin = this.pickStudentOrigin(student.addresses ?? []);
    const tutorPoint = this.pickTutorPoint(tutor.addresses ?? []);
    const distanceKm = this.distanceKmBetween(origin, tutorPoint);

    const photoUrl = await this.profilePictureService.resolveDisplayUrl(
      tutor.user?.profilePicture ?? tutor.user?.profilePictureThumbnailMedium,
    );
    const slotsThisWeek = slotCounts.get(tutor.id) ?? 0;

    return {
      tutorId: tutor.id,
      displayName: [tutor.user?.firstName, tutor.user?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Tutor',
      photoUrl,
      yearsOfExperience: tutor.yearsOfExperience,
      city: tutorPoint?.city ?? null,
      distanceKm,
      hasAvailabilityThisWeek: slotsThisWeek >= MIN_SLOTS_THIS_WEEK,
      slotsThisWeek,
      matchingOffering: this.toOfferingSummary(
        matching,
        rateCards.get(matching.id) ?? null,
        offeringsById,
      ),
      otherOfferings: offerings
        .filter((row) => row.id !== matching.id && isRateCardComplete(rateCards.get(row.id)))
        .map((row) =>
          this.toOfferingSummary(row, rateCards.get(row.id) ?? null, offeringsById),
        ),
    };
  }

  private toGraphqlHit(
    hit: ReturnType<typeof rankTutorSearchHits>[number],
    offerings: TutorOfferingEntity[],
  ): TutorSearchHit {
    const row = offerings.find((o) => o.tutorId === hit.tutorId);
    return {
      tutorId: hit.tutorId,
      displayName: hit.displayName,
      photoUrl: hit.photoUrl,
      yearsOfExperience:
        (row?.tutor?.yearsOfExperience as YearsOfExperienceEnum) ??
        YearsOfExperienceEnum.ZERO_TO_TWO,
      offeringLabel: hit.offeringLabel,
      matchingOfferingId: hit.matchingOfferingId,
      onlineEnabled: hit.onlineEnabled,
      offlineEnabled: hit.offlineEnabled,
      individualAvailable: hit.individualAvailable,
      groupAvailable: hit.groupAvailable,
      groupSize: hit.groupSize,
      rateInr: hit.rateInr,
      deliveryModeShown: hit.deliveryModeShown as TutorSearchDeliveryMode,
      distanceKm: hit.distanceKm,
      city: hit.city,
      freeDemoOffered: hit.freeDemoOffered,
      hasAvailabilityThisWeek: hit.hasAvailabilityThisWeek,
      slotsThisWeek: hit.slotsThisWeek,
    };
  }

  private toOfferingSummary(
    row: TutorOfferingEntity,
    rateCard: TutorOfferingRateCardEntity | null,
    offeringsById: Map<number, OfferingNodeForLabel>,
  ): TutorSearchOfferingSummary {
    const leaf = offeringsById.get(row.offeringId);
    return {
      offeringId: row.offeringId,
      offeringLabel: formatTutorOfferingFullLabel(leaf, offeringsById),
      onlineEnabled: rateCard?.onlineEnabled === true,
      offlineEnabled: rateCard?.offlineEnabled === true,
      onlineRateInr: rateCard ? starterRateForMode(rateCard, 'online') : null,
      offlineRateInr: rateCard ? starterRateForMode(rateCard, 'offline') : null,
      freeDemoOffered: rateCard?.freeDemoOffered === true,
    };
  }

  private async loadSlotsThisWeek(
    tutorIds: number[],
  ): Promise<Map<number, number>> {
    const counts = new Map<number, number>();
    if (tutorIds.length === 0) {
      return counts;
    }
    const now = new Date();
    const { weekStart, weekEnd } = currentIstWeekRange(now);
    const from = weekStart > now ? weekStart : now;
    const rows = await this.calendarRepo
      .createQueryBuilder('c')
      .select('c.tutorId', 'tutorId')
      .addSelect('COUNT(*)', 'count')
      .where('c.tutorId IN (:...tutorIds)', { tutorIds })
      .andWhere('c.deleted = false')
      .andWhere('c.startsAt >= :from', { from })
      .andWhere('c.startsAt < :weekEnd', { weekEnd })
      .groupBy('c.tutorId')
      .getRawMany<{ tutorId: string | number; count: string }>();
    for (const row of rows) {
      counts.set(Number(row.tutorId), Number(row.count) || 0);
    }
    return counts;
  }

  private distanceKmBetween(
    origin: AddressEntity | null,
    point: AddressEntity | null,
  ): number | null {
    if (!origin || !point) {
      return null;
    }
    if (
      !hasUsableCoordinates(origin.latitude, origin.longitude) ||
      !hasUsableCoordinates(point.latitude, point.longitude)
    ) {
      return null;
    }
    return haversineKm(
      Number(origin.latitude),
      Number(origin.longitude),
      Number(point.latitude),
      Number(point.longitude),
    );
  }

  private pickStudentOrigin(addresses: AddressEntity[]): AddressEntity | null {
    const usable = addresses.filter(
      (a) => !a.deleted && hasUsableCoordinates(a.latitude, a.longitude),
    );
    return usable.find((a) => a.primary) ?? usable[0] ?? null;
  }

  private pickTutorPoint(addresses: AddressEntity[]): AddressEntity | null {
    const usable = addresses.filter(
      (a) => !a.deleted && hasUsableCoordinates(a.latitude, a.longitude),
    );
    return (
      usable.find((a) => a.type === AddressType.TEACHING) ??
      usable.find((a) => a.type === AddressType.HOME) ??
      usable.find((a) => a.primary) ??
      usable[0] ??
      null
    );
  }

  private toCatalogMap(
    catalog: OfferingEntity[],
  ): Map<number, OfferingNodeForLabel> {
    return new Map(
      catalog.map((o) => [
        o.id,
        {
          id: o.id,
          displayName: o.displayName,
          level: o.level,
          mediumOfInstruction: o.mediumOfInstruction,
          parentOffering: o.parentOffering ? { id: o.parentOffering.id } : undefined,
          rootOffering: o.rootOffering
            ? { id: o.rootOffering.id, displayName: o.rootOffering.displayName }
            : undefined,
        },
      ]),
    );
  }

  private assertStudent(user: User): void {
    if (String(user.role).toUpperCase() !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can search tutors');
    }
  }
}
