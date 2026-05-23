import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  GET_ADMIN_TUTORS,
  GET_ADMIN_TUTOR_STAGE_COUNTS,
} from '@tutorix/shared-graphql';
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
} from '@tutorix/shared-utils';

type AdminTutorStageCountRow = {
  stage: string;
  count: number;
  pendingDocumentReviewCount?: number | null;
};

type AdminTutorListItemRow = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobile?: string | null;
  mobileCountryCode?: string | null;
  mobileNumber?: string | null;
  daysInStage: number;
  pendingAdminDocumentReview?: boolean;
};

type AdminTutorStageCountsData = {
  adminTutorStageCounts: AdminTutorStageCountRow[];
};

type AdminTutorsData = {
  adminTutors: {
    items: AdminTutorListItemRow[];
    totalPages: number;
    totalCount: number;
  };
};

const PAGE_SIZE = 20;

const TUTOR_STAGE_TABS = ONBOARDING_STEPS.filter((step) => step.id !== 'complete');

const STAGE_TAB_STYLES: Record<
  OnboardingStepId,
  { active: string; header: string; badge: string; badgeInactive: string; indicator: string }
> = {
  address: {
    active: 'border-sky-300 bg-gradient-to-b from-sky-50 to-white text-sky-900 shadow-sm',
    header: 'border-sky-200 bg-gradient-to-r from-sky-100/80 to-sky-50/50 text-sky-900',
    badge: 'bg-sky-500 text-white',
    badgeInactive: 'bg-sky-100 text-sky-700',
    indicator: 'bg-sky-500',
  },
  qualification: {
    active: 'border-indigo-300 bg-gradient-to-b from-indigo-50 to-white text-indigo-900 shadow-sm',
    header: 'border-indigo-200 bg-gradient-to-r from-indigo-100/80 to-indigo-50/50 text-indigo-900',
    badge: 'bg-indigo-500 text-white',
    badgeInactive: 'bg-indigo-100 text-indigo-700',
    indicator: 'bg-indigo-500',
  },
  experience: {
    active: 'border-violet-300 bg-gradient-to-b from-violet-50 to-white text-violet-900 shadow-sm',
    header: 'border-violet-200 bg-gradient-to-r from-violet-100/80 to-violet-50/50 text-violet-900',
    badge: 'bg-violet-500 text-white',
    badgeInactive: 'bg-violet-100 text-violet-700',
    indicator: 'bg-violet-500',
  },
  offerings: {
    active: 'border-purple-300 bg-gradient-to-b from-purple-50 to-white text-purple-900 shadow-sm',
    header: 'border-purple-200 bg-gradient-to-r from-purple-100/80 to-purple-50/50 text-purple-900',
    badge: 'bg-purple-500 text-white',
    badgeInactive: 'bg-purple-100 text-purple-700',
    indicator: 'bg-purple-500',
  },
  pt: {
    active: 'border-fuchsia-300 bg-gradient-to-b from-fuchsia-50 to-white text-fuchsia-900 shadow-sm',
    header: 'border-fuchsia-200 bg-gradient-to-r from-fuchsia-100/80 to-fuchsia-50/50 text-fuchsia-900',
    badge: 'bg-fuchsia-500 text-white',
    badgeInactive: 'bg-fuchsia-100 text-fuchsia-700',
    indicator: 'bg-fuchsia-500',
  },
  registrationPayment: {
    active: 'border-amber-300 bg-gradient-to-b from-amber-50 to-white text-amber-900 shadow-sm',
    header: 'border-amber-200 bg-gradient-to-r from-amber-100/80 to-amber-50/50 text-amber-900',
    badge: 'bg-amber-500 text-white',
    badgeInactive: 'bg-amber-100 text-amber-800',
    indicator: 'bg-amber-500',
  },
  docs: {
    active: 'border-emerald-300 bg-gradient-to-b from-emerald-50 to-white text-emerald-900 shadow-sm',
    header: 'border-emerald-200 bg-gradient-to-r from-emerald-100/80 to-emerald-50/50 text-emerald-900',
    badge: 'bg-emerald-500 text-white',
    badgeInactive: 'bg-emerald-100 text-emerald-700',
    indicator: 'bg-emerald-500',
  },
  interview: {
    active: 'border-rose-300 bg-gradient-to-b from-rose-50 to-white text-rose-900 shadow-sm',
    header: 'border-rose-200 bg-gradient-to-r from-rose-100/80 to-rose-50/50 text-rose-900',
    badge: 'bg-rose-500 text-white',
    badgeInactive: 'bg-rose-100 text-rose-700',
    indicator: 'bg-rose-500',
  },
  complete: {
    active: '',
    header: '',
    badge: '',
    badgeInactive: '',
    indicator: '',
  },
};

const ACTIVE_PANEL_STYLES: Record<OnboardingStepId, string> = {
  address: 'border-sky-200/80 shadow-sky-100/50',
  qualification: 'border-indigo-200/80 shadow-indigo-100/50',
  experience: 'border-violet-200/80 shadow-violet-100/50',
  offerings: 'border-purple-200/80 shadow-purple-100/50',
  pt: 'border-fuchsia-200/80 shadow-fuchsia-100/50',
  registrationPayment: 'border-amber-200/80 shadow-amber-100/50',
  docs: 'border-emerald-200/80 shadow-emerald-100/50',
  interview: 'border-rose-200/80 shadow-rose-100/50',
  complete: 'border-subtle',
};

function daysInStageBadgeClass(days: number): string {
  if (days >= 14) return 'bg-rose-100 text-rose-800 ring-1 ring-rose-200';
  if (days >= 7) return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  return 'bg-sky-100 text-sky-800 ring-1 ring-sky-200';
}

function formatTutorName(firstName?: string | null, lastName?: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || '—';
}

function formatMobile(
  mobile?: string | null,
  mobileCountryCode?: string | null,
  mobileNumber?: string | null,
): string {
  if (mobile?.trim()) {
    return mobile.trim();
  }
  if (mobileNumber?.trim()) {
    const code = mobileCountryCode?.trim() || '+91';
    return `${code} ${mobileNumber.trim()}`;
  }
  return '—';
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function TutorsPage() {
  const [activeStage, setActiveStage] = useState<OnboardingStepId>('address');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setPage(1);
  }, [activeStage, debouncedSearch]);

  const searchArg = debouncedSearch.trim() || undefined;

  const { data: countsData } = useQuery<AdminTutorStageCountsData>(GET_ADMIN_TUTOR_STAGE_COUNTS, {
    variables: { search: searchArg },
    fetchPolicy: 'cache-and-network',
  });

  const { data, loading, error } = useQuery<AdminTutorsData>(GET_ADMIN_TUTORS, {
    variables: {
      input: {
        certificationStage: activeStage,
        page,
        pageSize: PAGE_SIZE,
        search: searchArg,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const stageCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of countsData?.adminTutorStageCounts ?? []) {
      map.set(row.stage, row.count);
    }
    return map;
  }, [countsData]);

  const docsPendingReviewCount = useMemo(() => {
    const docsRow = countsData?.adminTutorStageCounts?.find((row) => row.stage === 'docs');
    return docsRow?.pendingDocumentReviewCount ?? 0;
  }, [countsData]);

  const result = data?.adminTutors;
  const items = result?.items ?? [];
  const totalPages = result?.totalPages ?? 0;
  const totalCount = result?.totalCount ?? 0;
  const activeTabStyles = STAGE_TAB_STYLES[activeStage];
  const activePanelStyle = ACTIVE_PANEL_STYLES[activeStage];

  return (
    <div>
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-sky-50/80 to-violet-50/80 px-6 py-5">
        <h1 className="text-2xl font-semibold text-primary">Tutors</h1>
        <p className="mt-1 text-sm text-muted">
          Browse tutors by onboarding stage. Search by name, email, or mobile.
        </p>
      </div>

      <div className="mt-6">
        <label htmlFor="tutor-search" className="sr-only">
          Search tutors
        </label>
        <div className="relative max-w-md">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sky-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
          </span>
          <input
            id="tutor-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or mobile"
            className="w-full rounded-xl border border-sky-200/80 bg-gradient-to-r from-white to-sky-50/50 py-2.5 pl-10 pr-4 text-sm text-primary shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
          />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-t-xl bg-gradient-to-r from-slate-50 via-white to-slate-50 px-1 pt-1">
        <div className="flex min-w-max gap-1.5 pb-0">
          {TUTOR_STAGE_TABS.map((step) => {
            const isActive = activeStage === step.id;
            const count = stageCounts.get(step.id);
            const styles = STAGE_TAB_STYLES[step.id];
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStage(step.id)}
                className={`relative flex items-center gap-2 rounded-t-xl border px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? `-mb-px border-b-0 ${styles.active}`
                    : 'border-transparent text-muted hover:border-gray-200 hover:bg-white/70 hover:text-primary'
                }`}
              >
                {isActive && (
                  <span
                    className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full ${styles.indicator}`}
                  />
                )}
                {step.title}
                {count !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive ? styles.badge : styles.badgeInactive
                    }`}
                  >
                    {count}
                  </span>
                )}
                {step.id === 'docs' && docsPendingReviewCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                    {docsPendingReviewCount} review
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`overflow-hidden rounded-b-xl rounded-tr-xl border bg-white shadow-md ${activePanelStyle}`}
      >
        {loading && (
          <p className="bg-gradient-to-r from-sky-50/50 to-violet-50/50 p-6 text-sm text-muted">
            Loading tutors…
          </p>
        )}

        {error && (
          <p className="p-6 text-sm text-red-600" role="alert">
            Could not load tutors. Please try again.
          </p>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 text-sm text-muted">
            No tutors at this stage.
          </p>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wide ${activeTabStyles.header}`}>
                  <th className="px-4 py-3">Tutor ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Days in stage</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tutor, index) => {
                  const needsReview =
                    activeStage === 'docs' && tutor.pendingAdminDocumentReview;

                  return (
                  <tr
                    key={tutor.id}
                    className={
                      needsReview
                        ? 'border-l-4 border-l-amber-500 bg-amber-50/70 hover:bg-amber-50'
                        : index % 2 === 0
                          ? 'bg-white hover:bg-sky-50/40'
                          : 'bg-slate-50/60 hover:bg-sky-50/50'
                    }
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-primary">#{tutor.id}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-primary">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/tutors/${tutor.id}`}
                          className="font-medium text-sky-800 underline-offset-2 hover:underline"
                        >
                          {formatTutorName(tutor.firstName, tutor.lastName)}
                        </Link>
                        {needsReview && (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                            Needs review
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{tutor.email ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">
                      {formatMobile(
                        tutor.mobile,
                        tutor.mobileCountryCode,
                        tutor.mobileNumber,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${daysInStageBadgeClass(tutor.daysInStage)}`}
                      >
                        {tutor.daysInStage}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && totalPages > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle bg-gradient-to-r from-slate-50/80 to-white px-4 py-3">
            <p className="text-sm text-muted">
              Page {page} of {totalPages} ({totalCount} tutor{totalCount === 1 ? '' : 's'})
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-800 transition enabled:hover:border-sky-400 enabled:hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-800 transition enabled:hover:border-violet-400 enabled:hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
