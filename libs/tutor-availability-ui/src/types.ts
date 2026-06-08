import type { OfferingWithRateCard } from '@tutorix/shared-utils';

export type TutorDetailOffering = OfferingWithRateCard & {
  id: number;
  offeringName?: string | null;
  offeringDisplayName?: string | null;
  offeringFullLabel?: string | null;
  status: string;
};
