import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  BANK_DETAILS_REQUIRED_FOR_RATE_CARD_MESSAGE,
  isBankDetailsComplete,
  isRateCardComplete,
  validateRateCardForm,
  type RateCardFormValues,
} from '@tutorix/shared-utils';
import { UserBankDetailsService } from '../../user-bank-details/services/user-bank-details.service';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { TutorOfferingStatusEnum } from '../../tutor/enums/tutor.enums';
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
    private readonly userBankDetailsService: UserBankDetailsService,
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
    if (tutorOffering.status !== TutorOfferingStatusEnum.pt_passed) {
      throw new BadRequestException(
        'Rate card can be set only after passing the proficiency test for this offering',
      );
    }

    const bankDetails = await this.userBankDetailsService.findByUserId(userId);
    if (!isBankDetailsComplete(bankDetails)) {
      throw new BadRequestException(BANK_DETAILS_REQUIRED_FOR_RATE_CARD_MESSAGE);
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
        batchSize:
          input.offlineBatchSize != null ? String(input.offlineBatchSize) : '1',
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
        batchSize: input.onlineBatchSize != null ? String(input.onlineBatchSize) : '1',
      },
    });

    if (validation.ok === false) {
      throw new BadRequestException(validation.message);
    }

    const normalized = validation.normalized;
    const fields = this.fieldsFromNormalized(normalized);
    const saved = await this.upsertRateCard(input.tutorOfferingId, fields);
    await this.copyToSamePtSiblings(tutorOffering, fields);
    return this.mapEntityToGraphql(saved);
  }

  async copyRateCardToOffering(
    sourceOfferingId: number,
    targetOfferingId: number,
  ): Promise<void> {
    if (sourceOfferingId === targetOfferingId) {
      return;
    }
    const source = await this.findByTutorOfferingId(sourceOfferingId);
    if (!source || !isRateCardComplete(source)) {
      return;
    }
    await this.upsertRateCard(targetOfferingId, this.fieldsFromEntity(source));
  }

  async resolveCompleteRateCards(
    offerings: Array<{
      id: number;
      tutorId: number;
      proficiencyTestId?: number | null;
    }>,
  ): Promise<Map<number, TutorOfferingRateCardEntity | null>> {
    const ownMap = await this.findByTutorOfferingIds(
      offerings.map((offering) => offering.id),
    );
    const resolved = new Map<number, TutorOfferingRateCardEntity | null>();
    const incomplete = offerings.filter(
      (offering) => !isRateCardComplete(ownMap.get(offering.id)),
    );

    let siblings: TutorOfferingEntity[] = [];
    let siblingCards = new Map<number, TutorOfferingRateCardEntity>();
    if (incomplete.length > 0) {
      const tutorIds = [...new Set(incomplete.map((offering) => offering.tutorId))];
      const ptIds = [
        ...new Set(
          incomplete
            .map((offering) => offering.proficiencyTestId)
            .filter((id): id is number => id != null),
        ),
      ];
      if (tutorIds.length > 0 && ptIds.length > 0) {
        siblings = await this.tutorOfferingRepo.find({
          where: {
            tutorId: In(tutorIds),
            proficiencyTestId: In(ptIds),
            status: TutorOfferingStatusEnum.pt_passed,
            deleted: false,
          },
        });
        siblingCards = await this.findByTutorOfferingIds(
          siblings.map((sibling) => sibling.id),
        );
      }
    }

    for (const offering of offerings) {
      const own = ownMap.get(offering.id) ?? null;
      if (isRateCardComplete(own)) {
        resolved.set(offering.id, own);
        continue;
      }
      const sibling = siblings.find(
        (row) =>
          row.id !== offering.id &&
          row.tutorId === offering.tutorId &&
          row.proficiencyTestId === offering.proficiencyTestId &&
          isRateCardComplete(siblingCards.get(row.id)),
      );
      resolved.set(
        offering.id,
        sibling ? (siblingCards.get(sibling.id) ?? own) : own,
      );
    }
    return resolved;
  }

  resolveCardFromLoadedOfferings(
    offering: { id: number; proficiencyTestId?: number | null },
    offerings: Array<{ id: number; proficiencyTestId?: number | null }>,
    rateCardMap: Map<number, TutorOfferingRateCardEntity>,
  ): TutorOfferingRateCardEntity | null {
    const own = rateCardMap.get(offering.id) ?? null;
    if (isRateCardComplete(own)) {
      return own;
    }
    const ptId = offering.proficiencyTestId;
    if (ptId == null) {
      return own;
    }
    for (const sibling of offerings) {
      if (sibling.id === offering.id || sibling.proficiencyTestId !== ptId) {
        continue;
      }
      const card = rateCardMap.get(sibling.id) ?? null;
      if (isRateCardComplete(card)) {
        return card;
      }
    }
    return own;
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
      offlineBatchSize: entity.offlineBatchSize ?? 1,
      onlineBatchSize: entity.onlineBatchSize ?? 1,
      isComplete: isRateCardComplete(entity),
    };
  }

  private fieldsFromNormalized(normalized: RateCardFormValues) {
    return {
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
      offlineBatchSize: normalized.offlineBatchSize,
      onlineBatchSize: normalized.onlineBatchSize,
    };
  }

  private fieldsFromEntity(entity: TutorOfferingRateCardEntity) {
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
      offlineBatchSize: entity.offlineBatchSize ?? 1,
      onlineBatchSize: entity.onlineBatchSize ?? 1,
    };
  }

  private async upsertRateCard(
    tutorOfferingId: number,
    fields: ReturnType<TutorRateCardService['fieldsFromNormalized']>,
  ): Promise<TutorOfferingRateCardEntity> {
    let entity = await this.findByTutorOfferingId(tutorOfferingId);
    if (entity) {
      Object.assign(entity, fields);
    } else {
      entity = this.rateCardRepo.create({ tutorOfferingId, ...fields });
    }
    return this.rateCardRepo.save(entity);
  }

  private async copyToSamePtSiblings(
    tutorOffering: TutorOfferingEntity,
    fields: ReturnType<TutorRateCardService['fieldsFromNormalized']>,
  ): Promise<void> {
    if (tutorOffering.proficiencyTestId == null) {
      return;
    }
    const siblings = await this.tutorOfferingRepo.find({
      where: {
        tutorId: tutorOffering.tutorId,
        proficiencyTestId: tutorOffering.proficiencyTestId,
        status: TutorOfferingStatusEnum.pt_passed,
        deleted: false,
      },
    });
    for (const sibling of siblings) {
      if (sibling.id === tutorOffering.id) {
        continue;
      }
      await this.upsertRateCard(sibling.id, fields);
    }
  }
}
