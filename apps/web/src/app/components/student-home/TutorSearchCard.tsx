import React from 'react';
import { formatInr, YEARS_OF_EXPERIENCE_LABELS, YearsOfExperienceEnum } from '@tutorix/shared-utils';

export type TutorSearchCardHit = {
  tutorId: number | string;
  displayName: string;
  photoUrl?: string | null;
  yearsOfExperience?: string;
  offeringLabel: string;
  matchingOfferingId: number | string;
  rateInr: number;
  deliveryModeShown: string;
  distanceKm?: number | null;
  city?: string | null;
  freeDemoOffered: boolean;
  hasAvailabilityThisWeek: boolean;
  groupSize: number;
};

type TutorSearchCardProps = {
  hit: TutorSearchCardHit;
  onView: () => void;
};

function yearsLabel(value?: string): string {
  if (!value) return '';
  const key = value as YearsOfExperienceEnum;
  return YEARS_OF_EXPERIENCE_LABELS[key] ?? '';
}

export const TutorSearchCard: React.FC<TutorSearchCardProps> = ({ hit, onView }) => {
  const mode =
    hit.deliveryModeShown === 'OFFLINE'
      ? hit.distanceKm != null
        ? `${hit.distanceKm.toFixed(1)} km`
        : hit.city || 'Offline'
      : 'Online';
  const formatChip = hit.groupSize > 1 ? `Group of ${hit.groupSize}` : '1:1';

  return (
    <article className="flex flex-col rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {hit.photoUrl ? (
          <img
            src={hit.photoUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-lg font-bold text-primary">
            {hit.displayName.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-primary">{hit.displayName}</h2>
            {hit.hasAvailabilityThisWeek ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#16a34a]">
                Available this week
              </span>
            ) : null}
          </div>
          {yearsLabel(hit.yearsOfExperience) ? (
            <p className="mt-0.5 text-xs text-muted">{yearsLabel(hit.yearsOfExperience)}</p>
          ) : null}
          <p className="mt-1 text-sm text-primary/80">{hit.offeringLabel}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">{mode}</span>
        <span className="rounded-full bg-gray-50 px-2.5 py-1 text-primary">{formatChip}</span>
        {hit.freeDemoOffered ? (
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-800">Free demo</span>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-base font-bold text-primary">
          {formatInr(hit.rateInr)}
          <span className="text-sm font-medium text-muted"> / class</span>
        </p>
        <button
          type="button"
          onClick={onView}
          className="rounded-lg bg-[#5fa8ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a97f5]"
        >
          View profile
        </button>
      </div>
    </article>
  );
};
