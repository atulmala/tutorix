import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  ADMIN_UPDATE_COMMUNICATION_RULE,
  ADMIN_UPDATE_COMMUNICATION_TEMPLATE,
  GET_ADMIN_COMMUNICATION_CATALOG,
} from '@tutorix/shared-graphql';

type Channel = 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP';
type EventGroup = 'Verification' | 'Wallet' | 'Classes' | 'Other';

type ChannelTemplate = {
  channel: Channel;
  templatePath: string;
  subject?: string | null;
  title?: string | null;
  text?: string | null;
  body: string;
  dltTemplateId?: string | null;
  dltEntityId?: string | null;
  dltHeader?: string | null;
  whatsappTemplateName?: string | null;
  variableMapping?: string | null;
};

type RuleView = {
  event: string;
  audience: string;
  label: string;
  enabled: boolean;
  mandatory: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  offsetMinutes?: number | null;
  allowedVariables: string[];
  samplePayloadJson: string;
  templates: ChannelTemplate[];
};

type Catalog = {
  emailConfigured: boolean;
  pushConfigured: boolean;
  smsConfigured: boolean;
  whatsappConfigured: boolean;
  events: RuleView[];
};

type CatalogData = { adminCommunicationCatalog: Catalog };

const CHANNELS: { key: Channel; flag: keyof RuleView; label: string }[] = [
  { key: 'EMAIL', flag: 'emailEnabled', label: 'Email' },
  { key: 'SMS', flag: 'smsEnabled', label: 'SMS' },
  { key: 'PUSH', flag: 'pushEnabled', label: 'Notification' },
  { key: 'WHATSAPP', flag: 'whatsappEnabled', label: 'WhatsApp' },
];

const CHANNEL_STYLES: Record<
  Channel,
  {
    chip: string;
    chipOn: string;
    tab: string;
    tabIdle: string;
    card: string;
    cardOn: string;
    iconBg: string;
    icon: string;
    focus: string;
  }
> = {
  EMAIL: {
    chip: 'bg-sky-100 text-sky-800',
    chipOn: 'bg-sky-500 text-white',
    tab: 'bg-sky-600 text-white shadow-md shadow-sky-200',
    tabIdle: 'border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100',
    card: 'border-sky-200 bg-white',
    cardOn: 'border-sky-300 bg-gradient-to-br from-sky-50 to-blue-100 ring-1 ring-sky-200',
    iconBg: 'bg-sky-500',
    icon: 'text-white',
    focus:
      'focus:border-sky-400 focus:ring-2 focus:ring-sky-100',
  },
  SMS: {
    chip: 'bg-amber-100 text-amber-800',
    chipOn: 'bg-amber-500 text-white',
    tab: 'bg-amber-500 text-white shadow-md shadow-amber-200',
    tabIdle: 'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
    card: 'border-amber-200 bg-white',
    cardOn:
      'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-100 ring-1 ring-amber-200',
    iconBg: 'bg-amber-500',
    icon: 'text-white',
    focus:
      'focus:border-amber-400 focus:ring-2 focus:ring-amber-100',
  },
  PUSH: {
    chip: 'bg-violet-100 text-violet-800',
    chipOn: 'bg-violet-500 text-white',
    tab: 'bg-violet-600 text-white shadow-md shadow-violet-200',
    tabIdle:
      'border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100',
    card: 'border-violet-200 bg-white',
    cardOn:
      'border-violet-300 bg-gradient-to-br from-violet-50 to-fuchsia-100 ring-1 ring-violet-200',
    iconBg: 'bg-violet-500',
    icon: 'text-white',
    focus:
      'focus:border-violet-400 focus:ring-2 focus:ring-violet-100',
  },
  WHATSAPP: {
    chip: 'bg-emerald-100 text-emerald-800',
    chipOn: 'bg-emerald-500 text-white',
    tab: 'bg-emerald-600 text-white shadow-md shadow-emerald-200',
    tabIdle:
      'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    card: 'border-emerald-200 bg-white',
    cardOn:
      'border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-100 ring-1 ring-emerald-200',
    iconBg: 'bg-emerald-500',
    icon: 'text-white',
    focus:
      'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100',
  },
};

const GROUP_STYLES: Record<
  EventGroup,
  { header: string; active: string; bar: string; idle: string }
> = {
  Verification: {
    header: 'text-amber-700',
    active:
      'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 ring-1 ring-amber-200/70',
    bar: 'bg-amber-500',
    idle: 'border-white bg-white hover:border-amber-200 hover:bg-amber-50/60',
  },
  Wallet: {
    header: 'text-emerald-700',
    active:
      'border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50 ring-1 ring-emerald-200/70',
    bar: 'bg-emerald-500',
    idle: 'border-white bg-white hover:border-emerald-200 hover:bg-emerald-50/60',
  },
  Classes: {
    header: 'text-indigo-700',
    active:
      'border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-sky-50 ring-1 ring-indigo-200/70',
    bar: 'bg-indigo-500',
    idle: 'border-white bg-white hover:border-indigo-200 hover:bg-indigo-50/60',
  },
  Other: {
    header: 'text-slate-600',
    active:
      'border-slate-300 bg-gradient-to-br from-slate-50 via-white to-slate-100 ring-1 ring-slate-200/70',
    bar: 'bg-slate-500',
    idle: 'border-white bg-white hover:border-slate-200 hover:bg-slate-50',
  },
};

const AUDIENCE_CHIP: Record<string, string> = {
  STUDENT: 'bg-violet-100 text-violet-800',
  TUTOR: 'bg-sky-100 text-sky-800',
  ACTOR: 'bg-fuchsia-100 text-fuchsia-800',
};

function eventGroup(event: string): EventGroup {
  if (event.includes('VERIFICATION')) return 'Verification';
  if (event.includes('WALLET')) return 'Wallet';
  if (event.includes('CLASS')) return 'Classes';
  return 'Other';
}

function ChannelIcon({
  channel,
  className = 'h-4 w-4',
}: {
  channel: Channel;
  className?: string;
}) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };
  if (channel === 'EMAIL') {
    return (
      <svg {...common}>
        <path d="M4 6h16v12H4z" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }
  if (channel === 'SMS') {
    return (
      <svg {...common}>
        <path d="M7 8h10M7 12h6" />
        <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3V7a2 2 0 0 1 2-2z" />
      </svg>
    );
  }
  if (channel === 'PUSH') {
    return (
      <svg {...common}>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 21a9 9 0 1 0-7.8-4.5L3 21l4.6-1.2A9 9 0 0 0 12 21z" />
    </svg>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
  prominent,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  prominent?: boolean;
}) {
  return (
    <label
      className={`inline-flex items-center ${
        prominent ? 'gap-3' : 'gap-2.5'
      } ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 rounded-full transition ${
          prominent ? 'h-8 w-14' : 'h-6 w-11'
        } ${
          checked
            ? 'bg-emerald-500'
            : prominent
              ? 'bg-red-500'
              : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute rounded-full bg-white shadow transition ${
            prominent
              ? `top-1 h-6 w-6 ${checked ? 'left-7' : 'left-1'}`
              : `top-0.5 left-0.5 h-5 w-5 ${
                  checked ? 'translate-x-5' : 'translate-x-0'
                }`
          }`}
        />
      </button>
      {label ? (
        <span
          className={
            prominent
              ? `text-lg font-bold uppercase tracking-wide ${
                  checked ? 'text-emerald-600' : 'text-red-600'
                }`
              : 'text-sm font-medium text-slate-700'
          }
        >
          {label}
        </span>
      ) : null}
    </label>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function preview(
  template: string,
  payloadJson: string,
  htmlEscape = false,
): string {
  let payload: Record<string, string> = {};
  try {
    payload = JSON.parse(payloadJson) as Record<string, string>;
  } catch {
    return template;
  }
  return template.replace(
    /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g,
    (_m, name: string) => {
      const value = payload[name] ?? '';
      return htmlEscape ? escapeHtml(value) : value;
    },
  );
}

const inputClass =
  'mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition';
const textareaClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition';

export function CommunicationPage() {
  const { data, loading, error, refetch } = useQuery<CatalogData>(
    GET_ADMIN_COMMUNICATION_CATALOG,
    { fetchPolicy: 'network-only' },
  );
  const catalog = data?.adminCommunicationCatalog;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel>('EMAIL');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const events = useMemo(() => catalog?.events ?? [], [catalog?.events]);
  const selected =
    events.find((row) => `${row.event}:${row.audience}` === selectedKey) ??
    events[0];

  useEffect(() => {
    if (!selectedKey && events[0]) {
      setSelectedKey(`${events[0].event}:${events[0].audience}`);
    }
  }, [events, selectedKey]);

  const [updateRule, { loading: savingRule }] = useMutation(
    ADMIN_UPDATE_COMMUNICATION_RULE,
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
  const [updateTemplate, { loading: savingTemplate }] = useMutation(
    ADMIN_UPDATE_COMMUNICATION_TEMPLATE,
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

  const template = selected?.templates.find((row) => row.channel === channel);

  const [draft, setDraft] = useState({
    subject: '',
    title: '',
    text: '',
    body: '',
    dltTemplateId: '',
    dltEntityId: '',
    dltHeader: '',
    whatsappTemplateName: '',
    variableMapping: '',
  });

  useEffect(() => {
    if (!template) return;
    setDraft({
      subject: template.subject ?? '',
      title: template.title ?? '',
      text: template.text ?? '',
      body: template.body ?? '',
      dltTemplateId: template.dltTemplateId ?? '',
      dltEntityId: template.dltEntityId ?? '',
      dltHeader: template.dltHeader ?? '',
      whatsappTemplateName: template.whatsappTemplateName ?? '',
      variableMapping: template.variableMapping ?? '',
    });
  }, [template]);

  const providerEnabled: Record<Channel, boolean> = {
    EMAIL: Boolean(catalog?.emailConfigured),
    SMS: Boolean(catalog?.smsConfigured),
    PUSH: Boolean(catalog?.pushConfigured),
    WHATSAPP: Boolean(catalog?.whatsappConfigured),
  };

  const previewText = useMemo(
    () => (selected ? preview(draft.body, selected.samplePayloadJson) : ''),
    [draft.body, selected],
  );
  const previewSubject = useMemo(
    () =>
      selected ? preview(draft.subject, selected.samplePayloadJson) : '',
    [draft.subject, selected],
  );
  const previewTitle = useMemo(
    () => (selected ? preview(draft.title, selected.samplePayloadJson) : ''),
    [draft.title, selected],
  );
  const previewHtml = useMemo(
    () =>
      selected
        ? preview(draft.body, selected.samplePayloadJson, true)
        : '',
    [draft.body, selected],
  );

  const saveRule = (patch: Partial<RuleView>) => {
    if (!selected) return;
    const next = { ...selected, ...patch };
    setErrorText(null);
    void updateRule({
      variables: {
        input: {
          event: next.event,
          audience: next.audience,
          enabled: next.enabled,
          emailEnabled: next.emailEnabled,
          smsEnabled: next.smsEnabled,
          pushEnabled: next.pushEnabled,
          whatsappEnabled: next.whatsappEnabled,
          offsetMinutes: next.offsetMinutes ?? null,
        },
      },
    });
  };

  const saveTemplate = () => {
    if (!selected) return;
    setErrorText(null);
    void updateTemplate({
      variables: {
        input: {
          event: selected.event,
          audience: selected.audience,
          channel,
          subject: draft.subject || null,
          title: draft.title || null,
          text: draft.text || null,
          body: draft.body,
          dltTemplateId: draft.dltTemplateId || null,
          dltEntityId: draft.dltEntityId || null,
          dltHeader: draft.dltHeader || null,
          whatsappTemplateName: draft.whatsappTemplateName || null,
          variableMapping: draft.variableMapping || null,
        },
      },
    });
  };

  const styles = CHANNEL_STYLES[channel];
  const group = selected ? eventGroup(selected.event) : 'Other';

  const fieldFocus = styles.focus;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-6 text-white shadow-md shadow-indigo-200/50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Messaging
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Communication</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Choose channels per event and edit file-backed templates. Copy lives
              on disk; the database stores the path only.
            </p>
          </div>
          <NavLink
            to="/communication/test-email"
            className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            Test email
          </NavLink>
        </div>
        {catalog && (
          <div className="mt-5 flex flex-wrap gap-2">
            {CHANNELS.map((c) => {
              const on = providerEnabled[c.key];
              return (
                <span
                  key={c.key}
                  className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      on ? 'bg-emerald-300' : 'bg-white/40'
                    }`}
                  />
                  {c.label}
                  <span className="text-white/70">
                    {on ? 'ready' : 'not configured'}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </header>

      {loading && (
        <p className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm text-indigo-700">
          Loading catalog…
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      )}

      {catalog && selected && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            {events.map((row, index) => {
              const key = `${row.event}:${row.audience}`;
              const active = key === `${selected.event}:${selected.audience}`;
              const rowGroup = eventGroup(row.event);
              const prevGroup =
                index > 0 ? eventGroup(events[index - 1].event) : null;
              const showHeader = rowGroup !== prevGroup;
              const look = GROUP_STYLES[rowGroup];
              return (
                <React.Fragment key={key}>
                  {showHeader && (
                    <p
                      className={`px-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        index === 0 ? '' : 'pt-2'
                      } ${look.header}`}
                    >
                      {rowGroup}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={`w-full overflow-hidden rounded-xl border px-3 py-3 text-left shadow-sm transition ${
                      active ? look.active : look.idle
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 h-8 w-1 shrink-0 rounded-full ${look.bar}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-800">
                            {row.label}
                          </span>
                          {row.mandatory ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                              required
                            </span>
                          ) : null}
                          {!row.enabled ? (
                            <span
                              className={
                                row.event === 'MOBILE_VERIFICATION'
                                  ? 'rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700'
                                  : 'rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500'
                              }
                            >
                              off
                            </span>
                          ) : row.event === 'MOBILE_VERIFICATION' ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                              on
                            </span>
                          ) : null}
                        </div>
                        <span
                          className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            AUDIENCE_CHIP[row.audience] ??
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.audience.toLowerCase()}
                        </span>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {CHANNELS.filter((c) => row[c.flag]).map((c) => (
                            <span
                              key={c.key}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CHANNEL_STYLES[c.key].chip}`}
                            >
                              {c.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-2xl border border-white bg-white shadow-md shadow-slate-200/70">
            <div
              className={`flex items-center justify-between gap-3 border-b px-6 py-4 ${GROUP_STYLES[group].active}`}
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selected.label}
                </h2>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                  {selected.event} / {selected.audience}
                </p>
                {selected.event === 'MOBILE_VERIFICATION' ? (
                  <p className="mt-2 max-w-xl text-xs text-slate-600">
                    When off, signup skips phone OTP and email verification also
                    marks the mobile as verified.
                  </p>
                ) : null}
              </div>
              <Toggle
                checked={selected.enabled}
                disabled={savingRule}
                onChange={(enabled) => saveRule({ enabled })}
                label={selected.enabled ? 'On' : 'Off'}
                prominent={selected.event === 'MOBILE_VERIFICATION'}
              />
            </div>

            <div className="space-y-6 p-6">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Channels
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {CHANNELS.map((c) => {
                    const disabled = !providerEnabled[c.key];
                    const on = Boolean(selected[c.flag]);
                    const look = CHANNEL_STYLES[c.key];
                    return (
                      <button
                        key={c.key}
                        type="button"
                        disabled={disabled || savingRule}
                        onClick={() => saveRule({ [c.flag]: !on })}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                          on ? look.cardOn : look.card
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${look.iconBg} ${look.icon}`}
                        >
                          <ChannelIcon channel={c.key} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">
                            {c.label}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            {disabled ? 'Not configured' : on ? 'Sending' : 'Off'}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!catalog.pushConfigured && (
                  <p className="mt-2 text-xs text-violet-700">
                    Push is disabled until Firebase Cloud Messaging credentials are
                    configured.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Template
                </p>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((c) => {
                    const look = CHANNEL_STYLES[c.key];
                    const activeTab = channel === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setChannel(c.key)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          activeTab ? look.tab : look.tabIdle
                        }`}
                      >
                        <ChannelIcon channel={c.key} className="h-3.5 w-3.5" />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {template && (
                <div className="space-y-4">
                  <p className="truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-500">
                    {template.templatePath}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.allowedVariables.map((name, i) => {
                      const palette = [
                        'bg-sky-100 text-sky-800',
                        'bg-violet-100 text-violet-800',
                        'bg-amber-100 text-amber-800',
                        'bg-emerald-100 text-emerald-800',
                        'bg-fuchsia-100 text-fuchsia-800',
                        'bg-rose-100 text-rose-800',
                      ];
                      return (
                        <span
                          key={name}
                          className={`rounded-full px-2.5 py-0.5 font-mono text-xs ${
                            palette[i % palette.length]
                          }`}
                        >
                          {`{{${name}}}`}
                        </span>
                      );
                    })}
                  </div>

                  {channel === 'EMAIL' && (
                    <>
                      <label className="block text-sm font-medium text-slate-800">
                        Subject
                        <input
                          className={`${inputClass} ${fieldFocus}`}
                          value={draft.subject}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, subject: e.target.value }))
                          }
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-800">
                        HTML body
                        <textarea
                          rows={10}
                          className={`${textareaClass} font-mono ${fieldFocus}`}
                          value={draft.body}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, body: e.target.value }))
                          }
                        />
                      </label>
                    </>
                  )}

                  {channel === 'PUSH' && (
                    <>
                      <label className="block text-sm font-medium text-slate-800">
                        Title
                        <input
                          className={`${inputClass} ${fieldFocus}`}
                          value={draft.title}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, title: e.target.value }))
                          }
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-800">
                        Body
                        <textarea
                          rows={4}
                          className={`${textareaClass} ${fieldFocus}`}
                          value={draft.body}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, body: e.target.value }))
                          }
                        />
                      </label>
                    </>
                  )}

                  {channel === 'SMS' && (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="block text-sm font-medium text-slate-800">
                          DLT template ID
                          <input
                            className={`${inputClass} ${fieldFocus}`}
                            value={draft.dltTemplateId}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                dltTemplateId: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="block text-sm font-medium text-slate-800">
                          DLT entity ID
                          <input
                            className={`${inputClass} ${fieldFocus}`}
                            value={draft.dltEntityId}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                dltEntityId: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="block text-sm font-medium text-slate-800">
                          DLT header
                          <input
                            className={`${inputClass} ${fieldFocus}`}
                            value={draft.dltHeader}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                dltHeader: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <label className="block text-sm font-medium text-slate-800">
                        Preview copy
                        <textarea
                          rows={4}
                          className={`${textareaClass} ${fieldFocus}`}
                          value={draft.body}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, body: e.target.value }))
                          }
                        />
                      </label>
                    </>
                  )}

                  {channel === 'WHATSAPP' && (
                    <>
                      <label className="block text-sm font-medium text-slate-800">
                        WhatsApp template name
                        <input
                          className={`${inputClass} ${fieldFocus}`}
                          value={draft.whatsappTemplateName}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              whatsappTemplateName: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-800">
                        Preview copy
                        <textarea
                          rows={4}
                          className={`${textareaClass} ${fieldFocus}`}
                          value={draft.body}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, body: e.target.value }))
                          }
                        />
                      </label>
                    </>
                  )}

                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                        channel === 'EMAIL'
                          ? 'bg-sky-50 text-sky-800'
                          : channel === 'SMS'
                            ? 'bg-amber-50 text-amber-800'
                            : channel === 'PUSH'
                              ? 'bg-violet-50 text-violet-800'
                              : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      <ChannelIcon channel={channel} className="h-3.5 w-3.5" />
                      Preview
                    </div>
                    {channel === 'EMAIL' && (
                      <div>
                        <div className="space-y-1 border-b border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Subject
                          </p>
                          <p className="text-sm font-medium text-slate-800">
                            {previewSubject || '(no subject)'}
                          </p>
                        </div>
                        {previewHtml.trim().length > 0 ? (
                          <iframe
                            key={`${selected.event}:${selected.audience}:email`}
                            title="Email preview"
                            sandbox="allow-same-origin"
                            srcDoc={previewHtml}
                            className="h-[320px] w-full bg-white"
                          />
                        ) : null}
                      </div>
                    )}
                    {channel === 'SMS' && (
                      <div className="bg-gradient-to-b from-slate-100 to-slate-200 px-6 py-8">
                        <div className="mx-auto max-w-sm rounded-[2rem] border border-slate-300 bg-slate-900 p-3 shadow-lg">
                          <div className="rounded-[1.4rem] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
                            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Messages
                            </p>
                            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-sky-500 px-3 py-2 text-sm text-white shadow-sm">
                              {previewText || '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {channel === 'PUSH' && (
                      <div className="bg-gradient-to-br from-violet-100 via-fuchsia-50 to-indigo-100 px-6 py-8">
                        <div className="mx-auto flex max-w-sm items-start gap-3 rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-violet-200 backdrop-blur">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                            <ChannelIcon channel="PUSH" className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-500">
                              Tutorix
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-900">
                              {previewTitle || 'Notification'}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {previewText || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {channel === 'WHATSAPP' && (
                      <div className="bg-[#ece5dd] px-6 py-8">
                        <div className="mx-auto max-w-sm">
                          <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-sm text-slate-800 shadow-sm">
                            {previewText || '—'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {errorText && (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {errorText}
                    </p>
                  )}
                  {saved && (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      Saved
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={saveTemplate}
                    disabled={savingTemplate}
                    className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60"
                  >
                    {savingTemplate ? 'Saving…' : 'Save template'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
