import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isRateCardComplete, validateRateCardForm } from '@tutorix/shared-utils';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { SaveTutorOfferingRateCardInput } from '../dto/save-tutor-offering-rate-card.input';
import { TutorOfferingRateCard } from '../dto/tutor-offering-rate-card.dto';
import { TutorOfferingRateCardEntity } from '../entities/tutor-offering-rate-card.entity';

@Injectable()
export class TutorRateCardService {
  constructor(
    @InjectRepository(TutorOfferingRateCardEntity)
    private readonly rateCardRepo: Repository<TutorOfferingRateCardEntity>,
    @InjectRepository(TutorOfferingEntity)
    private readonly tutorOfferingRepo: Repository<TutorOfferingEntity>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
  ) {}

  async findByTutorOfferingIds(
    tutorOfferingIds: number[],
  ): Promise<Map<number, TutorOfferingRateCardEntity>> {
    if (tutorOfferingIds.length === 0) {
      return new Map();
    }
    const rows = await this.rateCardRepo.find({
      where: { tutorOfferingId: In(tutorOfferingIds), deleted: false },
    });
    return new Map(rows.map((row) => [row.tutorOfferingId, row]));
  }

  async findByTutorOfferingId(
    tutorOfferingId: number,
  ): Promise<TutorOfferingRateCardEntity | null> {
    return this.rateCardRepo.findOne({
      where: { tutorOfferingId, deleted: false },
    });
  }

  async saveForTutorUser(
    userId: number,
    input: SaveTutorOfferingRateCardInput,
  ): Promise<TutorOfferingRateCard> {
    const tutor = await this.tutorRepo.findOne({
      where: { userId, deleted: false },
    });
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found for this user');
    }

    const tutorOffering = await this.tutorOfferingRepo.findOne({
      where: { id: input.tutorOfferingId, tutorId: tutor.id, deleted: false },
    });
    if (!tutorOffering) {
      throw new ForbiddenException('You do not have access to this offering');
    }

    const validation = validateRateCardForm({
      freeDemoOffered: input.freeDemoOffered,
      offline: {
        enabled: input.offlineEnabled,
        baseRate: input.offlineBaseRate != null ? String(input.offlineBaseRate) : '',
        baseDiscountPct:
          input.offlineBaseDiscountPct != null
            ? String(input.offlineBaseDiscountPct)
            : '',
        slab2DiscountPct:
          input.offlineSlab2DiscountPct != null
            ? String(input.offlineSlab2DiscountPct)
            : '',
        slab3DiscountPct:
          input.offlineSlab3DiscountPct != null
            ? String(input.offlineSlab3DiscountPct)
            : '',
      },
      online: {
        enabled: input.onlineEnabled,
        baseRate: input.onlineBaseRate != null ? String(input.onlineBaseRate) : '',
        baseDiscountPct:
          input.onlineBaseDiscountPct != null
            ? String(input.onlineBaseDiscountPct)
            : '',
        slab2DiscountPct:
          input.onlineSlab2DiscountPct != null
            ? String(input.onlineSlab2DiscountPct)
            : '',
        slab3DiscountPct:
          input.onlineSlab3DiscountPct != null
            ? String(input.onlineSlab3DiscountPct)
            : '',
      },
    });

    if (!validation.ok) {
      throw new BadRequestException(validation.message);
    }

    const normalized = validation.normalized;
    let entity = await this.findByTutorOfferingId(input.tutorOfferingId);

    if (entity) {
      entity.freeDemoOffered = normalized.freeDemoOffered;
      entity.offlineEnabled = normalized.offlineEnabled;
      entity.offlineBaseRate = normalized.offlineEnabled ? normalized.offlineBaseRate : null;
      entity.offlineBaseDiscountPct = normalized.offlineEnabled
        ? normalized.offlineBaseDiscountPct
        : 0;
      entity.offlineSlab2DiscountPct = normalized.offlineEnabled
        ? normalized.offlineSlab2DiscountPct
        : null;
      entity.offlineSlab3DiscountPct = normalized.offlineEnabled
        ? normalized.offlineSlab3DiscountPct
        : null;
      entity.onlineEnabled = normalized.onlineEnabled;
      entity.onlineBaseRate = normalized.onlineEnabled ? normalized.onlineBaseRate : null;
      entity.onlineBaseDiscountPct = normalized.onlineEnabled
        ? normalized.onlineBaseDiscountPct
        : 0;
      entity.onlineSlab2DiscountPct = normalized.onlineEnabled
        ? normalized.onlineSlab2DiscountPct
        : null;
      entity.onlineSlab3DiscountPct = normalized.onlineEnabled
        ? normalized.onlineSlab3DiscountPct
        : null;
    } else {
      entity = this.rateCardRepo.create({
        tutorOfferingId: input.tutorOfferingId,
        freeDemoOffered: normalized.freeDemoOffered,
        offlineEnabled: normalized.offlineEnabled,
        offlineBaseRate: normalized.offlineEnabled ? normalized.offlineBaseRate : null,
        offlineBaseDiscountPct: normalized.offlineEnabled
          ? normalized.offlineBaseDiscountPct
          : 0,
        offlineSlab2DiscountPct: normalized.offlineEnabled
          ? normalized.offlineSlab2DiscountPct
          : null,
        offlineSlab3DiscountPct: normalized.offlineEnabled
          ? normalized.offlineSlab3DiscountPct
          : null,
        onlineEnabled: normalized.onlineEnabled,
        onlineBaseRate: normalized.onlineEnabled ? normalized.onlineBaseRate : null,
        onlineBaseDiscountPct: normalized.onlineEnabled
          ? normalized.onlineBaseDiscountPct
          : 0,
        onlineSlab2DiscountPct: normalized.onlineEnabled
          ? normalized.onlineSlab2DiscountPct
          : null,
        onlineSlab3DiscountPct: normalized.onlineEnabled
          ? normalized.onlineSlab3DiscountPct
          : null,
      });
    }

    const saved = await this.rateCardRepo.save(entity);
    return this.mapEntityToGraphql(saved);
  }

  mapToGraphql(entity: TutorOfferingRateCardEntity | null): TutorOfferingRateCard | null {
    if (!entity) {
      return null;
    }
    return this.mapEntityToGraphql(entity);
  }

  private mapEntityToGraphql(entity: TutorOfferingRateCardEntity): TutorOfferingRateCard {
    return {
      freeDemoOffered: entity.freeDemoOffered,
      offlineEnabled: entity.offlineEnabled,
      offlineBaseRate: entity.offlineBaseRate ?? null,
      offlineBaseDiscountPct: entity.offlineBaseDiscountPct ?? 0,
      offlineSlab2DiscountPct: entity.offlineSlab2DiscountPct ?? null,
      offlineSlab3DiscountPct: entity.offlineSlab3DiscountPct ?? null,
      onlineEnabled: entity.onlineEnabled,
      onlineBaseRate: entity.onlineBaseRate ?? null,
      onlineBaseDiscountPct: entity.onlineBaseDiscountPct ?? 0,
      onlineSlab2DiscountPct: entity.onlineSlab2DiscountPct ?? null,
      onlineSlab3DiscountPct: entity.onlineSlab3DiscountPct ?? null,
      isComplete: isRateCardComplete(entity),
    };
  }
}
