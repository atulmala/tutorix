import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  ADMIN_UPDATE_PLATFORM_FEE,
  GET_ADMIN_PLATFORM_FEES,
} from '@tutorix/shared-graphql';

type DiscountType = 'NONE' | 'FIXED_INR' | 'PERCENT';

type PlatformFeeRow = {
  id: number;
  code: string;
  displayName: string;
  amountInr: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmountInr: number;
  effectiveAmountInr: number;
  waived: boolean;
  promoMessage?: string | null;
};

type AdminPlatformFeesData = {
  adminPlatformFees: PlatformFeeRow[];
};

type FeeDraft = {
  amountInr: number;
  discountType: DiscountType;
  discountValue: number;
  waived: boolean;
  promoMessage: string;
};

const DISCOUNT_TYPE_OPTIONS: { value: DiscountType; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'FIXED_INR', label: 'Fixed amount (INR)' },
  { value: 'PERCENT', label: 'Percent of list price' },
];

function computePreview(
  amountInr: number,
  discountType: DiscountType,
  discountValue: number,
  waived: boolean,
) {
  let discountAmountInr = 0;
  if (discountType === 'FIXED_INR') {
    discountAmountInr = Math.min(discountValue, amountInr);
  } else if (discountType === 'PERCENT') {
    discountAmountInr = Math.round((amountInr * discountValue) / 100);
  }
  const effectiveAmountInr = waived
    ? 0
    : Math.max(0, amountInr - discountAmountInr);
  return { discountAmountInr, effectiveAmountInr };
}

function FeeRowEditor({
  row,
  onSaved,
}: {
  row: PlatformFeeRow;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<FeeDraft>({
    amountInr: row.amountInr,
    discountType: row.discountType,
    discountValue: row.discountValue,
    waived: row.waived,
    promoMessage: row.promoMessage ?? '',
  });
  const [errorText, setErrorText] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const preview = useMemo(
    () =>
      computePreview(
        draft.amountInr,
        draft.discountType,
        draft.discountValue,
        draft.waived,
      ),
    [draft],
  );

  const [updateFee, { loading }] = useMutation(ADMIN_UPDATE_PLATFORM_FEE, {
    onCompleted: () => {
      setSaved(true);
      setErrorText(null);
      onSaved();
      window.setTimeout(() => setSaved(false), 2000);
    },
    onError: (error) => {
      setErrorText(error.message);
    },
  });

  const discountValueLabel =
    draft.discountType === 'PERCENT' ? 'Discount (%)' : 'Discount value';

  const handleSave = () => {
    setErrorText(null);
    void updateFee({
      variables: {
        input: {
          code: row.code,
          amountInr: draft.amountInr,
          discountType: draft.discountType,
          discountValue: draft.discountValue,
          waived: draft.waived,
          promoMessage: draft.promoMessage.trim() || null,
        },
      },
    });
  };

  return (
    <tr className="border-b border-subtle align-top">
      <td className="px-4 py-4">
        <p className="font-medium text-primary">{row.displayName}</p>
        <p className="mt-1 text-xs text-muted">{row.code}</p>
      </td>
      <td className="px-4 py-4">
        <input
          type="number"
          min={0}
          value={draft.amountInr}
          onChange={(e) =>
            setDraft((current) => ({
              ...current,
              amountInr: Number(e.target.value),
            }))
          }
          className="h-10 w-28 rounded-lg border border-subtle px-3 text-sm"
        />
      </td>
      <td className="px-4 py-4">
        <select
          value={draft.discountType}
          onChange={(e) =>
            setDraft((current) => ({
              ...current,
              discountType: e.target.value as DiscountType,
              discountValue:
                e.target.value === 'NONE' ? 0 : current.discountValue,
            }))
          }
          className="h-10 w-full min-w-[10rem] rounded-lg border border-subtle px-3 text-sm"
        >
          {DISCOUNT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-4">
        <label className="block text-xs text-muted">{discountValueLabel}</label>
        <input
          type="number"
          min={0}
          max={draft.discountType === 'PERCENT' ? 100 : draft.amountInr}
          disabled={draft.discountType === 'NONE'}
          value={draft.discountValue}
          onChange={(e) =>
            setDraft((current) => ({
              ...current,
              discountValue: Number(e.target.value),
            }))
          }
          className="mt-1 h-10 w-28 rounded-lg border border-subtle px-3 text-sm disabled:bg-gray-50"
        />
      </td>
      <td className="px-4 py-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.waived}
            onChange={(e) =>
              setDraft((current) => ({ ...current, waived: e.target.checked }))
            }
          />
          Waive off
        </label>
      </td>
      <td className="px-4 py-4">
        <textarea
          rows={3}
          value={draft.promoMessage}
          onChange={(e) =>
            setDraft((current) => ({ ...current, promoMessage: e.target.value }))
          }
          placeholder="Message shown when waived or discounted"
          className="w-full min-w-[16rem] rounded-lg border border-subtle px-3 py-2 text-sm"
        />
      </td>
      <td className="px-4 py-4 text-sm text-muted">
        <p>Discount: ₹{preview.discountAmountInr}</p>
        <p className="mt-1 font-medium text-primary">
          Effective: ₹{preview.effectiveAmountInr}
        </p>
      </td>
      <td className="px-4 py-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>
        {errorText ? (
          <p className="mt-2 max-w-xs text-xs text-red-700">{errorText}</p>
        ) : null}
      </td>
    </tr>
  );
}

export function FeesAndChargesPage() {
  const { data, loading, error, refetch } = useQuery<AdminPlatformFeesData>(
    GET_ADMIN_PLATFORM_FEES,
  );

  const rows = data?.adminPlatformFees ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Fees & Charges</h1>
        <p className="mt-1 text-sm text-muted">
          Manage platform fees used in tutor and student onboarding and proficiency
          tests.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading fees…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700">{error.message}</p>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-x-auto rounded-xl border border-subtle bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-subtle bg-gray-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">List price</th>
                <th className="px-4 py-3">Discount type</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Waived</th>
                <th className="px-4 py-3">Promo message</th>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <FeeRowEditor
                  key={row.code}
                  row={row}
                  onSaved={() => void refetch()}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
