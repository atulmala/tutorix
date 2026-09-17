import { PT_PASSED_OFFERING_STATUS } from './rate-card';

export const PT_ALREADY_CLEARED_MESSAGE =
  'PT for this offering has already been cleared';

export type PtOverlapOfferingLike = {
  id?: number | null;
  proficiencyTestId?: number | null;
  status?: string | null;
};

export function hasPassedOverlappingPt(
  offerings: PtOverlapOfferingLike[] | null | undefined,
  target: PtOverlapOfferingLike | null | undefined,
): boolean {
  const ptId = target?.proficiencyTestId;
  if (ptId == null || !target) {
    return false;
  }
  return (offerings ?? []).some(
    (offering) =>
      offering.id !== target.id &&
      offering.proficiencyTestId === ptId &&
      String(offering.status ?? '').toLowerCase() === PT_PASSED_OFFERING_STATUS,
  );
}
