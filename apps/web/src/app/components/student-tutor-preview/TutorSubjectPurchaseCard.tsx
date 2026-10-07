import React, { useMemo, useState } from 'react';
import {
  bulkDiscountNudge,
  formatInr,
  lockedDeliveryMode,
  discountedPackSlabLines,
  effectiveOfflineEnabledForBooking,
  OFFLINE_BOOKING_MAX_DISTANCE_KM,
  unitRateFromPackSlabs,
  type ClassPackSlabLine,
} from '@tutorix/shared-utils';

export type PreviewOffering = {
  offeringId: string | number;
  offeringLabel: string;
  onlineEnabled?: boolean;
  offlineEnabled?: boolean;
  onlineRateInr?: number | null;
  offlineRateInr?: number | null;
  onlineBaseRateInr?: number | null;
  offlineBaseRateInr?: number | null;
  freeDemoOffered?: boolean;
  demoAvailable?: boolean;
  onlinePackSlabs?: ClassPackSlabLine[];
  offlinePackSlabs?: ClassPackSlabLine[];
};

type TutorSubjectPurchaseCardProps = {
  offering: PreviewOffering;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  highlight?: boolean;
  adding: boolean;
  onAdd: (
    offeringId: string,
    deliveryMode: 'online' | 'offline',
    quantity: number,
  ) => Promise<void>;
  onBookDemo?: (
    offeringId: string,
    deliveryMode: 'online' | 'offline',
  ) => Promise<void>;
  onViewCart: () => void;
  /** Straight-line distance student ↔ tutor teaching location (km). */
  distanceKm?: number | null;
};

export const TutorSubjectPurchaseCard: React.FC<TutorSubjectPurchaseCardProps> = ({
  offering,
  distanceKm = null,
  defaultExpanded = false,
  collapsible = true,
  highlight = false,
  adding,
  onAdd,
  onBookDemo,
  onViewCart,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded || !collapsible);
  const [quantity, setQuantity] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState<'online' | 'offline' | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'cart' | 'demo' | null>(null);

  const offlineBookable = effectiveOfflineEnabledForBooking(
    offering.offlineEnabled === true,
    distanceKm,
  );
  const onlineBookable = offering.onlineEnabled === true;
  const locked = lockedDeliveryMode(offlineBookable, onlineBookable);
  const bothModes = offlineBookable && onlineBookable;
  const offlineTooFar =
    offering.offlineEnabled === true && !offlineBookable && onlineBookable;
  const mode = locked ?? deliveryMode;
  const onlineSlabs = offering.onlinePackSlabs ?? [];
  const offlineSlabs = offering.offlinePackSlabs ?? [];
  const unitRate = useMemo(() => {
    if (!mode) {
      return null;
    }
    const slabs =
      mode === 'online'
        ? (offering.onlinePackSlabs ?? [])
        : mode === 'offline'
          ? (offering.offlinePackSlabs ?? [])
          : [];
    return unitRateFromPackSlabs(slabs, quantity);
  }, [offering.onlinePackSlabs, offering.offlinePackSlabs, mode, quantity]);
  const lineTotal = unitRate != null ? unitRate * quantity : null;
  const discountNudge = mode
    ? bulkDiscountNudge(mode === 'online' ? onlineSlabs : offlineSlabs, quantity)
    : null;

  const offlineDiscountSlabs = discountedPackSlabLines(offlineSlabs);
  const onlineDiscountSlabs = discountedPackSlabLines(onlineSlabs);
  const hasPackSavings =
    (offlineBookable && offlineDiscountSlabs.length > 0) ||
    (onlineBookable && onlineDiscountSlabs.length > 0);
  const packDisplayMode =
    mode ??
    (bothModes
      ? null
      : offlineBookable
        ? 'offline'
        : onlineBookable
          ? 'online'
          : null);
  const showPackPricing = hasPackSavings && packDisplayMode != null;

  const handleAdd = async () => {
    const resolvedMode = locked ?? deliveryMode;
    if (!resolvedMode) {
      setCartMessage('Choose Online or Offline.');
      return;
    }
    setCartMessage(null);
    setPendingAction('cart');
    try {
      await onAdd(String(offering.offeringId), resolvedMode, quantity);
      setCartMessage('Added to cart.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleBookDemo = async () => {
    const resolvedMode = locked ?? deliveryMode;
    if (!resolvedMode || !onBookDemo) {
      setDemoError('Choose Online or Offline.');
      return;
    }
    setDemoError(null);
    setCartMessage(null);
    setPendingAction('demo');
    try {
      await onBookDemo(String(offering.offeringId), resolvedMode);
      setCartMessage('Free demo booked. Schedule it from your classes.');
    } catch (err) {
      setDemoError(
        err instanceof Error ? err.message : 'Could not book the free demo.',
      );
    } finally {
      setPendingAction(null);
    }
  };

  const header = (
    <button
      type="button"
      className={`flex w-full items-start justify-between gap-3 text-left ${
        collapsible ? 'cursor-pointer' : 'cursor-default'
      }`}
      onClick={() => {
        if (collapsible) {
          setExpanded((open) => !open);
        }
      }}
      aria-expanded={expanded}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {highlight ? (
            <span className="rounded-full bg-[#2563eb] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Your search
            </span>
          ) : null}
          {offering.freeDemoOffered ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#16a34a]">
              {offering.demoAvailable === false
                ? 'Free demo already booked'
                : 'Free demo'}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-base font-extrabold leading-snug text-[#143055]">
          {offering.offeringLabel}
        </p>
        <BaseRateRow offering={offering} distanceKm={distanceKm} />
        {!expanded && hasPackSavings ? (
          <p className="mt-2 text-xs font-semibold text-emerald-700">Pack discounts available</p>
        ) : null}
      </div>
      {collapsible ? (
        <span
          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-lg font-bold text-[#2563eb] transition ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ⌄
        </span>
      ) : null}
    </button>
  );

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
        highlight
          ? 'border-[#2563eb]/30 ring-1 ring-[#2563eb]/10'
          : 'border-slate-200/80 hover:border-sky-200'
      }`}
    >
      <div className={`p-5 ${highlight ? 'bg-gradient-to-br from-sky-50/80 to-white' : ''}`}>
        {header}
        {expanded ? (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            {showPackPricing ? (
              <PackSlabGrid
                offlineSlabs={offlineDiscountSlabs}
                onlineSlabs={onlineDiscountSlabs}
                activeMode={packDisplayMode}
              />
            ) : null}
            {hasPackSavings && bothModes && !packDisplayMode ? (
              <p className="text-sm text-slate-500">
                Choose Online or Offline below to see pack discounts for that mode.
              </p>
            ) : null}

            <div className="rounded-xl bg-slate-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Buy classes
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  aria-label="Decrease classes"
                  onClick={() => setQuantity(quantity - 1)}
                  className="h-9 w-9 rounded-lg bg-white text-lg font-bold text-[#143055] shadow-sm disabled:text-slate-300"
                >
                  −
                </button>
                <span className="min-w-[2rem] text-center text-sm font-extrabold text-[#143055]">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase classes"
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-9 w-9 rounded-lg bg-white text-lg font-bold text-[#143055] shadow-sm"
                >
                  +
                </button>
                <span className="text-sm text-slate-500">
                  {quantity === 1 ? 'class' : 'classes'}
                </span>
              </div>

              {offlineTooFar ? (
                <p className="mt-3 text-sm text-slate-600">
                  Offline is unavailable beyond {OFFLINE_BOOKING_MAX_DISTANCE_KM} km
                  {distanceKm != null ? ` (${distanceKm.toFixed(1)} km away)` : ''}. Book online
                  instead.
                </p>
              ) : null}
              {bothModes ? (
                <div className="mt-3 flex gap-2">
                  {(['offline', 'online'] as const).map((value) => {
                    const on = mode === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDeliveryMode(value)}
                        className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                          on ? 'bg-[#2563eb] text-white' : 'bg-white text-[#143055]'
                        }`}
                      >
                        {value === 'offline' ? 'Offline' : 'Online'}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-[#143055]">
                  {locked === 'online' ? 'Online' : 'Offline'}
                </p>
              )}

              {lineTotal != null && mode ? (
                <p className="mt-3 text-sm text-slate-600">
                  {formatInr(unitRate ?? 0)} / class × {quantity} ={' '}
                  <span className="font-extrabold text-[#143055]">{formatInr(lineTotal)}</span>
                </p>
              ) : null}
              {discountNudge ? (
                <p className="mt-2 text-sm font-semibold text-amber-800" role="status">
                  {discountNudge.message}
                </p>
              ) : null}

              {cartMessage ? (
                <p className="mt-2 text-sm font-semibold text-[#16a34a]">{cartMessage}</p>
              ) : null}
              {demoError ? (
                <p className="mt-2 text-sm font-semibold text-red-600">{demoError}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {offering.demoAvailable && onBookDemo ? (
                  <button
                    type="button"
                    disabled={adding || pendingAction != null}
                    onClick={() => void handleBookDemo()}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300"
                  >
                    {pendingAction === 'demo' ? 'Booking…' : 'Book free demo'}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={adding || pendingAction != null}
                  onClick={() => void handleAdd()}
                  className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:bg-slate-300"
                >
                  {pendingAction === 'cart' ? 'Adding…' : 'Add to cart'}
                </button>
                <button
                  type="button"
                  onClick={onViewCart}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#143055]"
                >
                  View cart
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
};

function displayBaseRateInr(
  offering: PreviewOffering,
  mode: 'online' | 'offline',
): number | null {
  if (mode === 'offline') {
    return offering.offlineBaseRateInr ?? offering.offlineRateInr ?? null;
  }
  return offering.onlineBaseRateInr ?? offering.onlineRateInr ?? null;
}

function BaseRateRow({
  offering,
  distanceKm,
}: {
  offering: PreviewOffering;
  distanceKm?: number | null;
}) {
  const offlineBase = displayBaseRateInr(offering, 'offline');
  const onlineBase = displayBaseRateInr(offering, 'online');
  const showOffline =
    effectiveOfflineEnabledForBooking(offering.offlineEnabled === true, distanceKm) &&
    offlineBase != null;
  const showOnline = offering.onlineEnabled === true && onlineBase != null;
  if (!showOffline && !showOnline) {
    return null;
  }

  return (
    <div className="mt-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Base rate</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {showOffline ? (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-900">
            Offline {formatInr(offlineBase)} / class
          </span>
        ) : null}
        {showOnline ? (
          <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-900">
            Online {formatInr(onlineBase)} / class
          </span>
        ) : null}
      </div>
    </div>
  );
}

function PackSlabGrid({
  offlineSlabs,
  onlineSlabs,
  activeMode,
}: {
  offlineSlabs: ClassPackSlabLine[];
  onlineSlabs: ClassPackSlabLine[];
  activeMode: 'online' | 'offline';
}) {
  const slabs = activeMode === 'offline' ? offlineSlabs : onlineSlabs;
  if (slabs.length === 0) {
    return null;
  }

  const title =
    activeMode === 'offline' ? 'Offline pack discounts' : 'Online pack discounts';

  return <PackSlabSection title={title} slabs={slabs} />;
}

function PackSlabSection({
  title,
  slabs,
}: {
  title: string;
  slabs: ClassPackSlabLine[];
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {slabs.map((slab) => (
          <div
            key={`${title}-${slab.label}`}
            className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-3 py-3"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {slab.label}
            </p>
            <p className="mt-1 text-lg font-extrabold text-[#143055]">
              {formatInr(slab.unitRateInr)} / class
            </p>
            <p className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
              Save {slab.discountPct}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
