import React from 'react';
import {
  type OnboardingTimelineEntry,
  type OnboardingTimelineStatus,
} from '../utils/onboarding-timeline';
import { formatDateTime } from '../utils/tutor-detail-formatters';

type OnboardingTimelineProps = {
  entries: OnboardingTimelineEntry[];
};

const STATUS_STYLES: Record<
  OnboardingTimelineStatus,
  { dot: string; line: string; label: string; date: string }
> = {
  completed: {
    dot: 'bg-emerald-500 ring-emerald-100',
    line: 'bg-emerald-200',
    label: 'text-emerald-950',
    date: 'text-emerald-800/80',
  },
  current: {
    dot: 'bg-sky-500 ring-sky-100 animate-pulse',
    line: 'bg-sky-200',
    label: 'text-sky-950 font-bold',
    date: 'text-sky-700 font-medium',
  },
  pending: {
    dot: 'bg-slate-200 ring-slate-50',
    line: 'bg-slate-100',
    label: 'text-slate-500',
    date: 'text-slate-400',
  },
  skipped: {
    dot: 'bg-amber-400 ring-amber-100',
    line: 'bg-amber-100',
    label: 'text-amber-950',
    date: 'text-amber-700/80 italic',
  },
};

function statusLabel(status: OnboardingTimelineStatus): string | null {
  if (status === 'current') return 'In progress';
  if (status === 'skipped') return 'Skipped';
  return null;
}

function formatEntryDate(entry: OnboardingTimelineEntry): string {
  if (entry.status === 'skipped') return 'Payment skipped';
  if (entry.completedAt) return formatDateTime(entry.completedAt);
  if (entry.status === 'current') return 'Not completed yet';
  return '—';
}

export function OnboardingTimeline({ entries }: OnboardingTimelineProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-violet-200/90 bg-gradient-to-b from-violet-50/40 to-white shadow-md shadow-violet-100/40">
      <div className="flex items-center gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-100 via-violet-50 to-white px-5 py-3.5">
        <span className="h-8 w-1 rounded-full bg-violet-500" aria-hidden />
        <h2 className="text-sm font-bold uppercase tracking-wide text-violet-900">
          Onboarding timeline
        </h2>
      </div>
      <ol className="divide-y divide-violet-100/80 px-5 py-1">
        {entries.map((entry, index) => {
          const styles = STATUS_STYLES[entry.status];
          const badge = statusLabel(entry.status);
          const isLast = index === entries.length - 1;

          return (
            <li key={entry.id} className="relative flex gap-3 py-2">
              {!isLast && (
                <span
                  className={`absolute bottom-0 left-[9px] top-7 w-0.5 -translate-x-1/2 ${styles.line}`}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 mt-1 h-5 w-5 shrink-0 rounded-full ring-4 ${styles.dot}`}
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className={`text-sm ${styles.label}`}>{entry.title}</p>
                  {badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        entry.status === 'current'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </div>
                <p className={`shrink-0 text-xs tabular-nums ${styles.date}`}>
                  {formatEntryDate(entry)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
