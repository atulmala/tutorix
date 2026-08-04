import { Injectable } from '@nestjs/common';
import {
  formatTutorOfferingPathLabel,
  type OfferingNodeForLabel,
} from '@tutorix/shared-utils';
import { OfferingEntity } from '../../offerings/entities/offering.entity';
import { OfferingService } from '../../offerings/services/offering.service';
import { ProficiencyTestService } from '../../proficiency/services/proficiency-test.service';
import { TutorOfferingService } from '../../tutor/services/tutor-offering.service';
import { WalletTransactionEntity } from '../entities/wallet-transaction.entity';
import { WalletTransactionTypeEnum } from '../enums/wallet.enums';

const OFFERING_ID_DESCRIPTION_RE =
  /^Proficiency test — Offering #(\d+)$/i;

@Injectable()
export class WalletOfferingLabelService {
  constructor(
    private readonly tutorOfferingService: TutorOfferingService,
    private readonly offeringService: OfferingService,
    private readonly proficiencyTestService: ProficiencyTestService,
  ) {}

  async buildProficiencyTestDescription(
    tutorOfferingId: number,
  ): Promise<string> {
    const label = await this.resolveTutorOfferingPathLabel(tutorOfferingId);
    return label
      ? `Proficiency test — ${label}`
      : `Proficiency test — Offering #${tutorOfferingId}`;
  }

  /**
   * Rewrite legacy "Offering #N" PT debit descriptions using catalog labels.
   */
  async enrichTransactionDescriptions(
    rows: WalletTransactionEntity[],
  ): Promise<WalletTransactionEntity[]> {
    const tutorOfferingIds = new Set<number>();

    for (const row of rows) {
      const id = this.extractTutorOfferingId(row);
      if (id != null) {
        tutorOfferingIds.add(id);
      }
    }

    if (tutorOfferingIds.size === 0) {
      return rows;
    }

    const labels = await this.resolveTutorOfferingPathLabels([
      ...tutorOfferingIds,
    ]);

    for (const row of rows) {
      const id = this.extractTutorOfferingId(row);
      if (id == null) {
        continue;
      }
      const label = labels.get(id);
      if (!label) {
        continue;
      }
      row.description = `Proficiency test — ${label}`;
    }

    return rows;
  }

  private extractTutorOfferingId(
    row: WalletTransactionEntity,
  ): number | null {
    if (row.type !== WalletTransactionTypeEnum.purchase_debit) {
      return null;
    }

    const match = row.description?.match(OFFERING_ID_DESCRIPTION_RE);
    if (!match) {
      return null;
    }

    // Prefer stored reference when present; fall back to the legacy Offering #N id.
    if (
      row.referenceType === 'tutor_offering' &&
      row.referenceId != null &&
      row.referenceId > 0
    ) {
      return row.referenceId;
    }

    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private async resolveTutorOfferingPathLabel(
    tutorOfferingId: number,
  ): Promise<string | null> {
    const labels = await this.resolveTutorOfferingPathLabels([tutorOfferingId]);
    return labels.get(tutorOfferingId) ?? null;
  }

  private async resolveTutorOfferingPathLabels(
    tutorOfferingIds: number[],
  ): Promise<Map<number, string>> {
    const result = new Map<number, string>();
    if (tutorOfferingIds.length === 0) {
      return result;
    }

    const tutorOfferings =
      await this.tutorOfferingService.findByIds(tutorOfferingIds);
    if (tutorOfferings.length === 0) {
      return result;
    }

    const [catalogOfferings, proficiencyTests] = await Promise.all([
      this.offeringService.findAll(),
      this.proficiencyTestService.findByIdsWithOfferings(
        tutorOfferings.map((to) => to.proficiencyTestId),
      ),
    ]);

    const offeringsById = new Map(
      catalogOfferings.map((o) => [o.id, this.toOfferingNodeForLabel(o)]),
    );
    const ptOfferingIdsByPtId = new Map(
      proficiencyTests.map((pt) => [
        pt.id,
        (pt.offerings ?? []).filter((o) => !o.deleted).map((o) => o.id),
      ]),
    );

    for (const tutorOffering of tutorOfferings) {
      const leaf = offeringsById.get(tutorOffering.offeringId);
      if (!leaf) {
        continue;
      }
      const label = formatTutorOfferingPathLabel(leaf, offeringsById, {
        proficiencyTestOfferingIds: ptOfferingIdsByPtId.get(
          tutorOffering.proficiencyTestId,
        ),
      });
      if (label && label !== '—') {
        result.set(tutorOffering.id, label);
      }
    }

    return result;
  }

  private toOfferingNodeForLabel(offering: OfferingEntity): OfferingNodeForLabel {
    return {
      id: offering.id,
      displayName: offering.displayName,
      level: offering.level,
      mediumOfInstruction: offering.mediumOfInstruction,
      parentOffering: offering.parentOffering
        ? { id: offering.parentOffering.id }
        : undefined,
      rootOffering: offering.rootOffering
        ? {
            id: offering.rootOffering.id,
            displayName: offering.rootOffering.displayName,
          }
        : undefined,
    };
  }
}
