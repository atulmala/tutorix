import React, { useEffect, useMemo, useState } from 'react';
import {
  calculateEffectiveRate,
  formatInr,
  isRateCardComplete,
  rateCardToFormInput,
  RATE_CARD_SLABS,
  validateRateCardForm,
  type RateCardFormInput,
  type RateCardFormValues,
  type RateCardLike,
} from '@tutorix/shared-utils';

export type RateCardFormValuesExport = RateCardFormValues;

type RateCardModeTab = 'offline' | 'online';

type ModeSectionProps = {
  title: string;
  values: RateCardFormInput['offline'];
  onChange: (next: RateCardFormInput['offline']) => void;
  disabled?: boolean;
};

type RateCardModeTabsProps = {
  activeTab: RateCardModeTab;
  onTabChange: (tab: RateCardModeTab) => void;
  disabled?: boolean;
};

function RateCardModeTabs({ activeTab, onTabChange, disabled }: RateCardModeTabsProps) {
  const tabs: { id: RateCardModeTab; label: string }[] = [
    { id: 'offline', label: 'Offline classes' },
    { id: 'online', label: 'Online classes' },
  ];

  return (
    <div
      role="tablist"
      aria-label="Class delivery mode"
      className="flex gap-0 rounded-lg border border-purple-200 bg-purple-50/50 p-1"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`rate-card-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`rate-card-panel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            disabled={disabled}
            className={`flex-1 rounded-md px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isActive
                ? 'bg-white text-purple-950 shadow-sm ring-1 ring-purple-200'
                : 'text-purple-800/70 hover:bg-white/60 hover:text-purple-950'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function inputCls(disabled?: boolean): string {
  return `w-full rounded-md border border-subtle bg-white px-md py-sm text-primary shadow-sm focus:border-primary focus:outline-none${
    disabled ? ' cursor-not-allowed opacity-60' : ''
  }`;
}

function slabInputCls(inputsDisabled?: boolean): string {
  return `w-16 rounded-md border border-subtle px-2 py-1 text-center text-primary${
    inputsDisabled ? ' cursor-not-allowed bg-subtle/30 opacity-60' : ''
  }`;
}

function ModeSection({ title, values, onChange, disabled }: ModeSectionProps) {
  const inputsDisabled = disabled || !values.enabled;
  const baseRateNum = Number.parseInt(values.baseRate.trim(), 10);
  const hasBaseRate = values.enabled && !Number.isNaN(baseRateNum) && baseRateNum >= 1;

  const baseDiscountPct = values.baseDiscountPct.trim()
    ? Number.parseInt(values.baseDiscountPct.trim(), 10)
    : 0;
  const slab2Pct = values.slab2DiscountPct.trim()
    ? Number.parseInt(values.slab2DiscountPct.trim(), 10)
    : 0;
  const slab3Pct = values.slab3DiscountPct.trim()
    ? Number.parseInt(values.slab3DiscountPct.trim(), 10)
    : 0;

  return (
    <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={values.enabled}
          onChange={(e) => onChange({ ...values, enabled: e.target.checked })}
          disabled={disabled}
          className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
        />
        <span className="text-sm font-semibold text-purple-950">{title}</span>
      </label>

      <div className="mt-4 space-y-4" aria-disabled={inputsDisabled}>
        <div className="space-y-1 text-left">
          <label className="text-sm font-medium text-primary">Base rate (per class)</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
              ₹
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={values.baseRate}
              onChange={(e) =>
                onChange({ ...values, baseRate: e.target.value.replace(/\D/g, '') })
              }
              disabled={inputsDisabled}
              className={`${inputCls(inputsDisabled)} pl-7`}
              placeholder="500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-800/80">
            Bulk booking discounts (% off base rate)
          </p>
          <div
            className={`space-y-2 rounded-lg border border-purple-100 bg-white/80 p-3${
              inputsDisabled ? ' opacity-60' : ''
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-purple-950">{RATE_CARD_SLABS[0].label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={values.baseDiscountPct}
                  onChange={(e) =>
                    onChange({
                      ...values,
                      baseDiscountPct: e.target.value.replace(/\D/g, '').slice(0, 2),
                    })
                  }
                  disabled={inputsDisabled}
                  className={slabInputCls(inputsDisabled)}
                  placeholder="0"
                />
                <span className="text-muted">%</span>
                {hasBaseRate ? (
                  <span className="text-purple-800/70">
                    → {formatInr(calculateEffectiveRate(baseRateNum, baseDiscountPct))}/class
                  </span>
                ) : (
                  <span className="text-purple-800/70">Base discount</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-purple-950">{RATE_CARD_SLABS[1].label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={values.slab2DiscountPct}
                  onChange={(e) =>
                    onChange({
                      ...values,
                      slab2DiscountPct: e.target.value.replace(/\D/g, '').slice(0, 2),
                    })
                  }
                  disabled={inputsDisabled}
                  className={slabInputCls(inputsDisabled)}
                  placeholder="0"
                />
                <span className="text-muted">%</span>
                {hasBaseRate ? (
                  <span className="text-purple-800/70">
                    → {formatInr(calculateEffectiveRate(baseRateNum, slab2Pct))}/class
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-purple-950">{RATE_CARD_SLABS[2].label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={values.slab3DiscountPct}
                  onChange={(e) =>
                    onChange({
                      ...values,
                      slab3DiscountPct: e.target.value.replace(/\D/g, '').slice(0, 2),
                    })
                  }
                  disabled={inputsDisabled}
                  className={slabInputCls(inputsDisabled)}
                  placeholder="0"
                />
                <span className="text-muted">%</span>
                {hasBaseRate ? (
                  <span className="text-purple-800/70">
                    → {formatInr(calculateEffectiveRate(baseRateNum, slab3Pct))}/class
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type RateCardModalProps = {
  open: boolean;
  offeringName: string;
  initialValues?: RateCardLike | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: RateCardFormValues) => void;
};

export function RateCardModal({
  open,
  offeringName,
  initialValues,
  saving = false,
  error,
  onClose,
  onSubmit,
}: RateCardModalProps) {
  const [form, setForm] = useState<RateCardFormInput>(() => rateCardToFormInput(initialValues));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RateCardModeTab>('offline');

  useEffect(() => {
    if (!open) {
      return;
    }
    const nextForm = rateCardToFormInput(initialValues);
    setForm(nextForm);
    setValidationError(null);
    setActiveTab(
      nextForm.online.enabled && !nextForm.offline.enabled ? 'online' : 'offline',
    );
  }, [open, initialValues]);

  const modalTitle = useMemo(
    () => (isRateCardComplete(initialValues) ? 'Edit rate card' : 'Rate card'),
    [initialValues],
  );

  if (!open) {
    return null;
  }

  const handleSubmit = () => {
    const result = validateRateCardForm(form);
    if (result.ok === false) {
      setValidationError(result.message);
      return;
    }
    setValidationError(null);
    onSubmit(result.normalized);
  };

  const displayError = validationError ?? error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rate-card-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="rate-card-title" className="text-xl font-semibold text-primary">
              {modalTitle}
            </h3>
            <p className="mt-1 text-sm text-muted">{offeringName}</p>
            <p className="mt-0.5 text-xs text-muted">Set how you charge for this offering.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition hover:text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-purple-100 bg-purple-50/30 px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.freeDemoOffered}
              onChange={(e) => setForm((prev) => ({ ...prev, freeDemoOffered: e.target.checked }))}
              disabled={saving}
              className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-purple-950">
              Free demo class for new students
            </span>
          </label>

          <div>
            <RateCardModeTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              disabled={saving}
            />

            <div className="mt-4">
              <div
                role="tabpanel"
                id="rate-card-panel-offline"
                aria-labelledby="rate-card-tab-offline"
                hidden={activeTab !== 'offline'}
              >
                <ModeSection
                  title="Offer offline classes"
                  values={form.offline}
                  onChange={(offline) => setForm((prev) => ({ ...prev, offline }))}
                  disabled={saving}
                />
              </div>
              <div
                role="tabpanel"
                id="rate-card-panel-online"
                aria-labelledby="rate-card-tab-online"
                hidden={activeTab !== 'online'}
              >
                <ModeSection
                  title="Offer online classes"
                  values={form.online}
                  onChange={(online) => setForm((prev) => ({ ...prev, online }))}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {displayError ? (
            <p className="text-sm text-red-600" role="alert">
              {displayError}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-subtle px-4 py-2 text-sm font-medium text-primary transition hover:bg-subtle"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save rate card'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
