import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  ADMIN_CREATE_PAYMENT_GATEWAY_FEE,
  ADMIN_UPDATE_CLASS_PRICING_SETTINGS,
  ADMIN_UPDATE_PAYMENT_GATEWAY_FEE,
  ADMIN_UPDATE_PAYMENT_GATEWAY_FEE_SETTINGS,
  ADMIN_UPDATE_PAYMENT_PROVIDER_SELECTION,
  ADMIN_UPDATE_PLATFORM_FEE,
  GET_ADMIN_CLASS_PRICING_SETTINGS,
  GET_ADMIN_PAYMENT_GATEWAY_FEE_CONFIG,
  GET_ADMIN_PAYMENT_PROVIDER_SELECTION,
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

type ClassPricingSettings = {
  minimumOnlinePricePerClassInr: number;
  minimumOfflinePricePerClassInr: number;
  commissionSlabThresholdInr: number;
  tutorCommissionPercentUpToSlab: number;
  tutorCommissionPercentAboveSlab: number;
  platformFeePerParticipantInr: number;
};

type AdminClassPricingData = {
  adminClassPricingSettings: ClassPricingSettings;
};

function toClassPricingMutationInput(
  source: ClassPricingSettings & { __typename?: string },
): ClassPricingSettings {
  return {
    minimumOnlinePricePerClassInr: source.minimumOnlinePricePerClassInr,
    minimumOfflinePricePerClassInr: source.minimumOfflinePricePerClassInr,
    commissionSlabThresholdInr: source.commissionSlabThresholdInr,
    tutorCommissionPercentUpToSlab: source.tutorCommissionPercentUpToSlab,
    tutorCommissionPercentAboveSlab: source.tutorCommissionPercentAboveSlab,
    platformFeePerParticipantInr: source.platformFeePerParticipantInr,
  };
}

function ClassPricingSection() {
  const { data, loading, error, refetch } = useQuery<AdminClassPricingData>(
    GET_ADMIN_CLASS_PRICING_SETTINGS,
    { fetchPolicy: 'network-only' },
  );
  const [draft, setDraft] = useState<ClassPricingSettings>({
    minimumOnlinePricePerClassInr: 0,
    minimumOfflinePricePerClassInr: 0,
    commissionSlabThresholdInr: 600,
    tutorCommissionPercentUpToSlab: 0,
    tutorCommissionPercentAboveSlab: 0,
    platformFeePerParticipantInr: 0,
  });
  const [saved, setSaved] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const settings = data?.adminClassPricingSettings;
    if (!settings) {
      return;
    }
    setDraft(toClassPricingMutationInput(settings));
  }, [data]);

  const [updateSettings, { loading: saving }] = useMutation(
    ADMIN_UPDATE_CLASS_PRICING_SETTINGS,
    {
      onCompleted: () => {
        setSaved(true);
        setErrorText(null);
        void refetch();
        window.setTimeout(() => setSaved(false), 2000);
      },
      onError: (err) => {
        setErrorText(err.message);
      },
    },
  );

  const handleSave = () => {
    setErrorText(null);
    const input = toClassPricingMutationInput(draft);
    void updateSettings({ variables: { input } });
  };

  if (loading) {
    return <p className="text-sm text-muted">Loading class pricing…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-700">{error.message}</p>;
  }

  const numberField = (
    label: string,
    key: keyof ClassPricingSettings,
    options?: { min?: number; max?: number },
  ) => (
    <div>
      <label className="block text-sm font-medium text-primary">{label}</label>
      <input
        type="number"
        min={options?.min ?? 0}
        max={options?.max}
        value={draft[key]}
        onChange={(e) =>
          setDraft((current) => ({
            ...current,
            [key]: Number(e.target.value),
          }))
        }
        className="mt-1 h-10 w-full max-w-xs rounded-lg border border-subtle px-3 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-4 rounded-xl border border-subtle bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Class pricing</h2>
        <p className="mt-1 text-sm text-muted">
          Minimum tutor rates apply to the lowest discounted per-class price (including
          bulk slabs). Commission and per-participant fees are stored for billing later.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {numberField('Minimum online class price (INR)', 'minimumOnlinePricePerClassInr')}
        {numberField('Minimum offline class price (INR)', 'minimumOfflinePricePerClassInr')}
        {numberField('Commission slab threshold (INR)', 'commissionSlabThresholdInr', {
          min: 1,
        })}
        {numberField(
          'Tutor commission % (class rate up to threshold)',
          'tutorCommissionPercentUpToSlab',
          { max: 100 },
        )}
        {numberField(
          'Tutor commission % (class rate above threshold)',
          'tutorCommissionPercentAboveSlab',
          { max: 100 },
        )}
        {numberField('Platform fee per participant (INR)', 'platformFeePerParticipantInr')}
      </div>
      {errorText ? <p className="text-sm text-red-700">{errorText}</p> : null}
      {saved ? <p className="text-sm text-green-700">Class pricing saved.</p> : null}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save class pricing'}
      </button>
    </div>
  );
}

type GatewayFeeRow = {
  id: number;
  provider: string;
  displayName: string;
  chargePercent: number;
};

type GatewayDraft = {
  displayName: string;
  chargePercent: number;
};

type AdminPaymentGatewayFeeData = {
  adminPaymentGatewayFeeConfig: {
    gstRatePercent: number;
    gateways: GatewayFeeRow[];
  };
};

function draftsFromGateways(gateways: GatewayFeeRow[]): Record<string, GatewayDraft> {
  const drafts: Record<string, GatewayDraft> = {};
  for (const row of gateways) {
    drafts[row.provider] = {
      displayName: row.displayName,
      chargePercent: row.chargePercent,
    };
  }
  return drafts;
}

type PaymentProviderOption = {
  provider: string;
  label: string;
  configured: boolean;
};

type PaymentProviderSelection = {
  activePaymentGateway: string;
  tutorPayoutProvider: string;
  paymentGatewayOptions: PaymentProviderOption[];
  tutorPayoutOptions: PaymentProviderOption[];
};

type AdminPaymentProviderSelectionData = {
  adminPaymentProviderSelection: PaymentProviderSelection;
};

function providerLabel(options: PaymentProviderOption[], provider: string): string {
  return options.find((option) => option.provider === provider)?.label ?? provider;
}

function PaymentProviderSelectionSection() {
  const { data, loading, error, refetch } = useQuery<AdminPaymentProviderSelectionData>(
    GET_ADMIN_PAYMENT_PROVIDER_SELECTION,
    { fetchPolicy: 'network-only' },
  );
  const [gatewayDraft, setGatewayDraft] = useState('');
  const [payoutDraft, setPayoutDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const selection = data?.adminPaymentProviderSelection;
    if (!selection) {
      return;
    }
    setGatewayDraft(selection.activePaymentGateway);
    setPayoutDraft(selection.tutorPayoutProvider);
  }, [data]);

  const [updateSelection, { loading: saving }] = useMutation(
    ADMIN_UPDATE_PAYMENT_PROVIDER_SELECTION,
    {
      onCompleted: () => {
        setSaved(true);
        setErrorText(null);
        void refetch();
        window.setTimeout(() => setSaved(false), 2000);
      },
      onError: (err) => setErrorText(err.message),
    },
  );

  if (loading) {
    return <p className="text-sm text-muted">Loading payment providers…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-700">{error.message}</p>;
  }
  const selection = data?.adminPaymentProviderSelection;
  if (!selection) {
    return null;
  }

  const gatewayChanged = gatewayDraft !== selection.activePaymentGateway;
  const payoutChanged = payoutDraft !== selection.tutorPayoutProvider;

  const save = () => {
    const changes: string[] = [];
    if (gatewayChanged) {
      changes.push(
        `New student payments will use ${providerLabel(selection.paymentGatewayOptions, gatewayDraft)}.`,
      );
    }
    if (payoutChanged) {
      changes.push(
        `New tutor payouts will use ${providerLabel(selection.tutorPayoutOptions, payoutDraft)}.`,
      );
    }
    if (
      !window.confirm(
        `${changes.join('\n')}\n\nPayments and payouts already in progress are unaffected. Continue?`,
      )
    ) {
      return;
    }
    void updateSelection({
      variables: {
        input: {
          ...(gatewayChanged ? { activePaymentGateway: gatewayDraft } : {}),
          ...(payoutChanged ? { tutorPayoutProvider: payoutDraft } : {}),
        },
      },
    });
  };

  const renderSelect = (
    id: string,
    label: string,
    value: string,
    current: string,
    options: PaymentProviderOption[],
    onChange: (value: string) => void,
  ) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-primary">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full max-w-xs rounded-lg border border-subtle bg-white px-3 text-sm"
      >
        {options.map((option) => (
          <option
            key={option.provider}
            value={option.provider}
            disabled={!option.configured && option.provider !== current}
          >
            {option.label}
            {option.configured ? '' : ' (not configured)'}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-4 rounded-xl border border-subtle bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Active payment providers</h2>
        <p className="mt-1 text-sm text-muted">
          Which provider handles new student payments and new tutor bank payouts. Changes apply
          immediately; payments and payouts already in progress finish on the provider they
          started with. Provider credentials are managed on the server.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-6">
        {renderSelect(
          'active-payment-gateway',
          'Student payments',
          gatewayDraft,
          selection.activePaymentGateway,
          selection.paymentGatewayOptions,
          setGatewayDraft,
        )}
        {renderSelect(
          'tutor-payout-provider',
          'Tutor payouts',
          payoutDraft,
          selection.tutorPayoutProvider,
          selection.tutorPayoutOptions,
          setPayoutDraft,
        )}
        <button
          type="button"
          disabled={saving || (!gatewayChanged && !payoutChanged)}
          onClick={save}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save providers'}
        </button>
        {saved ? <span className="text-sm text-green-700">Saved.</span> : null}
      </div>
      {errorText ? <p className="text-sm text-red-700">{errorText}</p> : null}
    </div>
  );
}

function PaymentGatewayFeeSection() {
  const { data, loading, error, refetch } = useQuery<AdminPaymentGatewayFeeData>(
    GET_ADMIN_PAYMENT_GATEWAY_FEE_CONFIG,
    { fetchPolicy: 'network-only' },
  );
  const [gstDraft, setGstDraft] = useState(18);
  const [gatewayDrafts, setGatewayDrafts] = useState<Record<string, GatewayDraft>>({});
  const [newGatewayName, setNewGatewayName] = useState('');
  const [newGatewayCharge, setNewGatewayCharge] = useState(2);
  const [gstSaved, setGstSaved] = useState(false);
  const [gatewaySaved, setGatewaySaved] = useState<string | null>(null);
  const [createSaved, setCreateSaved] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const config = data?.adminPaymentGatewayFeeConfig;
    if (!config) {
      return;
    }
    setGstDraft(config.gstRatePercent);
    setGatewayDrafts(draftsFromGateways(config.gateways));
  }, [data]);

  const [updateGst, { loading: savingGst }] = useMutation(
    ADMIN_UPDATE_PAYMENT_GATEWAY_FEE_SETTINGS,
    {
      onCompleted: () => {
        setGstSaved(true);
        setErrorText(null);
        void refetch();
        window.setTimeout(() => setGstSaved(false), 2000);
      },
      onError: (err) => setErrorText(err.message),
    },
  );

  const [updateGateway, { loading: savingGateway }] = useMutation(
    ADMIN_UPDATE_PAYMENT_GATEWAY_FEE,
    {
      onCompleted: (_data, context) => {
        const provider = context?.variables?.input?.provider as string | undefined;
        if (provider) {
          setGatewaySaved(provider);
          window.setTimeout(() => setGatewaySaved(null), 2000);
        }
        setErrorText(null);
        void refetch();
      },
      onError: (err) => setErrorText(err.message),
    },
  );

  const [createGateway, { loading: creatingGateway }] = useMutation(
    ADMIN_CREATE_PAYMENT_GATEWAY_FEE,
    {
      onCompleted: () => {
        setCreateSaved(true);
        setNewGatewayName('');
        setNewGatewayCharge(2);
        setErrorText(null);
        void refetch();
        window.setTimeout(() => setCreateSaved(false), 2000);
      },
      onError: (err) => setErrorText(err.message),
    },
  );

  if (loading) {
    return <p className="text-sm text-muted">Loading payment gateway fees…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-700">{error.message}</p>;
  }

  const gatewayRows = data?.adminPaymentGatewayFeeConfig.gateways ?? [];

  return (
    <div className="space-y-4 rounded-xl border border-subtle bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Payment gateway fees</h2>
        <p className="mt-1 text-sm text-muted">
          Gateway charge percentages and GST on those charges are deducted from tutor payout
          on student-paid gross for concluded classes.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-primary">
          GST on gateway charges (%)
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={gstDraft}
            onChange={(e) => setGstDraft(Number(e.target.value))}
            className="h-10 w-full max-w-xs rounded-lg border border-subtle px-3 text-sm"
          />
          <button
            type="button"
            disabled={savingGst}
            onClick={() =>
              void updateGst({ variables: { input: { gstRatePercent: gstDraft } } })
            }
            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {savingGst ? 'Saving…' : 'Save GST rate'}
          </button>
          {gstSaved ? <span className="text-sm text-green-700">Saved.</span> : null}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-subtle">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-subtle bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Gateway</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Charge (%)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {gatewayRows.map((row) => {
              const draft = gatewayDrafts[row.provider] ?? {
                displayName: row.displayName,
                chargePercent: row.chargePercent,
              };
              return (
                <tr key={row.id} className="border-b border-subtle last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={draft.displayName}
                      onChange={(e) =>
                        setGatewayDrafts((current) => ({
                          ...current,
                          [row.provider]: {
                            ...draft,
                            displayName: e.target.value,
                          },
                        }))
                      }
                      className="h-9 w-full min-w-[8rem] rounded-md border border-subtle px-2"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{row.provider}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={draft.chargePercent}
                      onChange={(e) =>
                        setGatewayDrafts((current) => ({
                          ...current,
                          [row.provider]: {
                            ...draft,
                            chargePercent: Number(e.target.value),
                          },
                        }))
                      }
                      className="h-9 w-24 rounded-md border border-subtle px-2"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={savingGateway}
                      onClick={() => {
                        void updateGateway({
                          variables: {
                            input: {
                              provider: row.provider,
                              displayName: draft.displayName,
                              chargePercent: draft.chargePercent,
                            },
                          },
                        });
                      }}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    {gatewaySaved === row.provider ? (
                      <span className="ml-2 text-xs text-green-700">Saved</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-dashed border-subtle bg-gray-50/80 p-4">
        <h3 className="text-sm font-semibold text-primary">Add payment gateway</h3>
        <p className="mt-1 text-xs text-muted">
          Provider key is generated from the name (e.g. &quot;PayU&quot; → payu). Use the same key
          when integrating checkout.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="font-medium text-primary">Name</span>
            <input
              type="text"
              value={newGatewayName}
              onChange={(e) => setNewGatewayName(e.target.value)}
              placeholder="e.g. PayU"
              className="mt-1 h-10 w-full min-w-[10rem] rounded-lg border border-subtle px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-primary">Charge (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={newGatewayCharge}
              onChange={(e) => setNewGatewayCharge(Number(e.target.value))}
              className="mt-1 h-10 w-28 rounded-lg border border-subtle px-3 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={creatingGateway || !newGatewayName.trim()}
            onClick={() =>
              void createGateway({
                variables: {
                  input: {
                    displayName: newGatewayName.trim(),
                    chargePercent: newGatewayCharge,
                  },
                },
              })
            }
            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creatingGateway ? 'Adding…' : 'Add gateway'}
          </button>
          {createSaved ? <span className="text-sm text-green-700">Gateway added.</span> : null}
        </div>
      </div>
      {errorText ? <p className="text-sm text-red-700">{errorText}</p> : null}
    </div>
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
          Manage onboarding and proficiency test fees, plus class pricing rules for
          tutor rate cards and platform billing.
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

      <ClassPricingSection />
      <PaymentProviderSelectionSection />
      <PaymentGatewayFeeSection />
    </div>
  );
}
