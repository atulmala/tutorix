import React, { useMemo, useState } from 'react';
import {
  RATE_CARD_REQUIRED_MESSAGE,
  tutorHasAtLeastOneCompleteRateCard,
} from '@tutorix/shared-utils';
import { TutorAvailabilityCalendar } from './TutorAvailabilityCalendar';
import type { TutorDetailOffering } from './types';

export type TutorAvailabilitySectionProps = {
  canSetAvailability: boolean;
  offerings: TutorDetailOffering[];
  onOpenRateCard?: (offering: TutorDetailOffering) => void;
  /** Admin detail: load this tutor's calendar (read-only). */
  tutorId?: number;
  readOnly?: boolean;
  /** Section title; defaults to "My Calendar" or "Tutor calendar" when read-only. */
  title?: string;
  /** When true, hide the section entirely if rate card / offering requirements are not met. */
  hideWhenLocked?: boolean;
};

const CALENDAR_STYLES = {
  unlocked: {
    border: 'border-teal-200/90',
    shadow: 'shadow-teal-100/40',
    header: 'bg-gradient-to-r from-teal-100 via-teal-50 to-white',
    headerText: 'text-teal-900',
    bar: 'bg-teal-500',
    body: 'bg-gradient-to-b from-teal-50/30 to-white',
  },
  locked: {
    border: 'border-amber-200/90',
    shadow: 'shadow-amber-100/40',
    header: 'bg-gradient-to-r from-amber-100 via-amber-50 to-white',
    headerText: 'text-amber-900',
    bar: 'bg-amber-500',
    body: 'bg-gradient-to-b from-amber-50/40 to-white',
  },
} as const;

function CollapsibleSectionCard({
  title,
  defaultOpen = false,
  variant = 'unlocked',
  updatedTillLabel,
  updatedTillLoading = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  variant?: keyof typeof CALENDAR_STYLES;
  updatedTillLabel?: string | null;
  updatedTillLoading?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const styles = CALENDAR_STYLES[variant];

  const toggleBtnClass =
    variant === 'locked'
      ? 'border-amber-300 bg-white text-amber-800 hover:bg-amber-50'
      : 'border-teal-300 bg-white text-teal-800 hover:bg-teal-50';

  return (
    <section
      className={`overflow-hidden rounded-2xl border shadow-md ${styles.border} ${styles.shadow}`}
    >
      <div
        className={`flex w-full flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 ${styles.header}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className={`h-8 w-1 shrink-0 rounded-full ${styles.bar}`} aria-hidden />
          <div className="min-w-0">
            <h2
              className={`text-sm font-bold uppercase tracking-wide ${styles.headerText}`}
            >
              {title}
            </h2>
            {updatedTillLoading ? (
              <p className={`mt-0.5 text-xs font-normal normal-case ${styles.headerText} opacity-80`}>
                Loading update status…
              </p>
            ) : updatedTillLabel ? (
              <p className={`mt-0.5 text-xs font-normal normal-case ${styles.headerText} opacity-90`}>
                Updated till {updatedTillLabel}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Hide calendar' : 'Show calendar'}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors ${toggleBtnClass}`}
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
      {open ? <div className={`p-5 ${styles.body}`}>{children}</div> : null}
    </section>
  );
}

export function TutorAvailabilitySection({
  canSetAvailability,
  offerings,
  onOpenRateCard,
  tutorId,
  readOnly = false,
  title,
  hideWhenLocked = false,
}: TutorAvailabilitySectionProps) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [updatedTillLabel, setUpdatedTillLabel] = useState<string | null>(null);
  const [updatedTillLoading, setUpdatedTillLoading] = useState(false);
  const hasLocalRateCard = useMemo(
    () => tutorHasAtLeastOneCompleteRateCard(offerings),
    [offerings],
  );
  const hasOfferings = offerings.length > 0;
  const unlocked =
    hasOfferings && hasLocalRateCard && (readOnly || canSetAvailability);

  const sectionTitle =
    title ?? (readOnly ? 'Tutor calendar' : 'My Calendar');

  const firstOfferingNeedingRate = offerings.find(
    (o) => !tutorHasAtLeastOneCompleteRateCard([o]),
  );

  if (!unlocked) {
    if (hideWhenLocked) {
      return null;
    }
    return (
      <CollapsibleSectionCard title={sectionTitle} variant="locked">
        <p className="text-sm text-amber-900/90">{RATE_CARD_REQUIRED_MESSAGE}</p>
        {firstOfferingNeedingRate && onOpenRateCard ? (
          <button
            type="button"
            className="mt-3 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
            onClick={() => onOpenRateCard(firstOfferingNeedingRate)}
          >
            Set up rate card
          </button>
        ) : null}
      </CollapsibleSectionCard>
    );
  }

  return (
    <CollapsibleSectionCard
      title={sectionTitle}
      defaultOpen={false}
      updatedTillLabel={updatedTillLabel}
      updatedTillLoading={updatedTillLoading}
    >
      {!readOnly ? (
        <p className="mb-4 text-sm text-teal-900/80">
          Click a slot to mark available (A). Empty slots are not offered to students.
          Each slot is a 1-hour class.
        </p>
      ) : (
        <p className="mb-4 text-sm text-teal-900/80">
          View-only schedule. Green slots (A) are when this tutor is available for classes.
        </p>
      )}
      <TutorAvailabilityCalendar
        tutorId={tutorId}
        readOnly={readOnly}
        onSaveError={setSaveError}
        onUpdatedTill={({ label, loading }) => {
          setUpdatedTillLabel(label);
          setUpdatedTillLoading(loading);
        }}
      />
      {saveError ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {saveError}
        </p>
      ) : null}
    </CollapsibleSectionCard>
  );
}
