import React, { useMemo, useState } from 'react';
import {
  formatInr,
  lockedDeliveryMode,
  packSlabsHaveDiscount,
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
  freeDemoOffered?: boolean;
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
  onViewCart: () => void;
};

export const TutorSubjectPurchaseCard: React.FC<TutorSubjectPurchaseCardProps> = ({
  offering,
  defaultExpanded = false,
  collapsible = true,
  highlight = false,
  adding,
  onAdd,
  onViewCart,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded || !collapsible);
  const [quantity, setQuantity] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState<'online' | 'offline' | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  const locked = lockedDeliveryMode(
    offering.offlineEnabled === true,
    offering.onlineEnabled === true,
  );
  const bothModes = offering.offlineEnabled === true && offering.onlineEnabled === true;
  const mode = locked ?? deliveryMode;
  const onlineSlabs = offering.onlinePackSlabs ?? [];
  const offlineSlabs = offering.offlinePackSlabs ?? [];
  const activeSlabs = mode === 'online' ? onlineSlabs : mode === 'offline' ? offlineSlabs : [];
  const unitRate = useMemo(() => {
    if (!mode) {
      return null;
    }
    return unitRateFromPackSlabs(activeSlabs, quantity);
  }, [activeSlabs, mode, quantity]);
  const lineTotal = unitRate != null ? unitRate * quantity : null;

  const hasSlabPricing = offlineSlabs.length > 0 || onlineSlabs.length > 0;
  const hasPackSavings =
    packSlabsHaveDiscount(offlineSlabs) || packSlabsHaveDiscount(onlineSlabs);

  const handleAdd = async () => {
    const resolvedMode = locked ?? deliveryMode;
    if (!resolvedMode) {
      setCartMessage('Choose Online or Offline.');
      return;
    }
    setCartMessage(null);
    await onAdd(String(offering.offeringId), resolvedMode, quantity);
    setCartMessage('Added to cart.');
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
              Free demo
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-base font-extrabold leading-snug text-[#143055]">
          {offering.offeringLabel}
        </p>
        <BaseRateRow offering={offering} />
        {!expanded && hasPackSavings ? (
          <p className="mt-2 text-xs font-semibold text-emerald-700">Pack discounts on 5+ classes</p>
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
            {hasSlabPricing ? (
              <PackSlabGrid
                offlineSlabs={offlineSlabs}
                onlineSlabs={onlineSlabs}
                offlineEnabled={offering.offlineEnabled === true}
                onlineEnabled={offering.onlineEnabled === true}
                activeMode={mode}
              />
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

              {cartMessage ? (
                <p className="mt-2 text-sm font-semibold text-[#16a34a]">{cartMessage}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={adding}
                  onClick={() => void handleAdd()}
                  className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:bg-slate-300"
                >
                  {adding ? 'Adding…' : 'Add to cart'}
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

function BaseRateRow({ offering }: { offering: PreviewOffering }) {
  const showOffline =
    offering.offlineEnabled === true && offering.offlineRateInr != null;
  const showOnline =
    offering.onlineEnabled === true && offering.onlineRateInr != null;
  if (!showOffline && !showOnline) {
    return null;
  }

  return (
    <div className="mt-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Base rate</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {showOffline ? (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-900">
            Offline {formatInr(offering.offlineRateInr ?? 0)} / class
          </span>
        ) : null}
        {showOnline ? (
          <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-900">
            Online {formatInr(offering.onlineRateInr ?? 0)} / class
          </span>
        ) : null}
      </div>
    </div>
  );
}

function PackSlabGrid({
  offlineSlabs,
  onlineSlabs,
  offlineEnabled,
  onlineEnabled,
  activeMode,
}: {
  offlineSlabs: ClassPackSlabLine[];
  onlineSlabs: ClassPackSlabLine[];
  offlineEnabled: boolean;
  onlineEnabled: boolean;
  activeMode: 'online' | 'offline' | null;
}) {
  const sections: { key: string; title: string; slabs: ClassPackSlabLine[] }[] = [];

  if (activeMode === 'offline' && offlineSlabs.length > 0) {
    sections.push({ key: 'offline', title: 'Offline pack pricing', slabs: offlineSlabs });
  } else if (activeMode === 'online' && onlineSlabs.length > 0) {
    sections.push({ key: 'online', title: 'Online pack pricing', slabs: onlineSlabs });
  } else if (!activeMode) {
    if (offlineEnabled && offlineSlabs.length > 0) {
      sections.push({ key: 'offline', title: 'Offline pack pricing', slabs: offlineSlabs });
    }
    if (onlineEnabled && onlineSlabs.length > 0) {
      sections.push({ key: 'online', title: 'Online pack pricing', slabs: onlineSlabs });
    }
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <PackSlabSection key={section.key} title={section.title} slabs={section.slabs} />
      ))}
      {!activeMode && offlineEnabled && onlineEnabled && sections.length > 1 ? (
        <p className="text-xs text-slate-500">
          Choose Online or Offline below for your line total.
        </p>
      ) : null}
    </div>
  );
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
            className={`rounded-xl border px-3 py-3 ${
              (slab.discountPct ?? 0) > 0
                ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
                : 'border-slate-100 bg-white'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {slab.label}
            </p>
            <p className="mt-1 text-lg font-extrabold text-[#143055]">
              {formatInr(slab.unitRateInr)} / class
            </p>
            {(slab.discountPct ?? 0) > 0 ? (
              <p className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                Save {slab.discountPct}%
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-slate-400">Standard rate</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
