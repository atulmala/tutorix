import {
  formatTutorOfferingFullLabel,
  type OfferingNodeForLabel,
} from '@tutorix/shared-utils';
import { OfferingEntity } from '../offerings/entities/offering.entity';

export function offeringsByIdFromCatalog(
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
        parentOffering: o.parentOffering
          ? { id: o.parentOffering.id }
          : undefined,
        rootOffering: o.rootOffering
          ? { id: o.rootOffering.id, displayName: o.rootOffering.displayName }
          : undefined,
      },
    ]),
  );
}

/** Label for cart/credits using the catalog offering the student searched (not the tutor PT leaf). */
export function resolveStudentCartOfferingDisplay(
  catalogOfferingId: number | null | undefined,
  tutorCatalogOfferingId: number | null | undefined,
  tutorLeafDisplayName: string | null | undefined,
  offeringsById: Map<number, OfferingNodeForLabel>,
): { offeringId: number; offeringLabel: string } {
  const displayOfferingId =
    catalogOfferingId != null && catalogOfferingId > 0
      ? catalogOfferingId
      : (tutorCatalogOfferingId ?? 0);
  const leaf = offeringsById.get(displayOfferingId);
  const fullLabel = formatTutorOfferingFullLabel(leaf, offeringsById);
  const offeringLabel =
    fullLabel && fullLabel !== '—'
      ? fullLabel
      : (tutorLeafDisplayName ?? 'Class');
  return { offeringId: displayOfferingId, offeringLabel };
}
