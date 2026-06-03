import type { OfferingRateCardRef } from '@tutorix/shared-utils';

export type TutorDetailOffering = {
  id: number;
  offeringName?: string | null;
  offeringDisplayName?: string | null;
  offeringFullLabel?: string | null;
  rateCard?: OfferingRateCardRef | null;
};
