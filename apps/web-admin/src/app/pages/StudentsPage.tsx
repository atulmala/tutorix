import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_ADMIN_STUDENTS,
  GET_ADMIN_STUDENT_STAGE_COUNTS,
} from '@tutorix/shared-graphql';
import {
  ADMIN_STUDENT_LIST_TABS,
  STUDENT_ONBOARDING_STEPS,
  type AdminStudentListTabId,
} from '@tutorix/shared-utils';

type AdminStudentStageCountRow = {
  stage: string;
  count: number;
};

type AdminStudentListItemRow = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobile?: string | null;
  mobileCountryCode?: string | null;
  mobileNumber?: string | null;
  onboardingStage?: string | null;
  onBoardingComplete: boolean;
  daysInStage: number;
};

type AdminStudentStageCountsData = {
  adminStudentStageCounts: AdminStudentStageCountRow[];
};

type AdminStudentsData = {
  adminStudents: {
    items: AdminStudentListItemRow[];
    totalPages: number;
    totalCount: number;
  };
};

const PAGE_SIZE = 20;

const STAGE_HEADER_STYLES: Record<AdminStudentListTabId, string> = {
  parent: 'border-sky-200 bg-gradient-to-r from-sky-100/80 to-sky-50/50 text-sky-900',
  address: 'border-indigo-200 bg-gradient-to-r from-indigo-100/80 to-indigo-50/50 text-indigo-900',
  education: 'border-violet-200 bg-gradient-to-r from-violet-100/80 to-violet-50/50 text-violet-900',
  complete: 'border-teal-200 bg-gradient-to-r from-teal-100/80 to-teal-50/50 text-teal-900',
};

const ACTIVE_PANEL_STYLES: Record<AdminStudentListTabId, string> = {
  parent: 'border-sky-200/80 shadow-sky-100/50',
  address: 'border-indigo-200/80 shadow-indigo-100/50',
  education: 'border-violet-200/80 shadow-violet-100/50',
  complete: 'border-teal-200/80 shadow-teal-100/50',
};

const ACTIVE_TAB_STYLES: Record<AdminStudentListTabId, string> = {
  parent: 'border-sky-500 bg-sky-50 text-sky-900',
  address: 'border-indigo-500 bg-indigo-50 text-indigo-900',
  education: 'border-violet-500 bg-violet-50 text-violet-900',
  complete: 'border-teal-500 bg-teal-50 text-teal-900',
};

function daysInStageBadgeClass(days: number): string {
  if (days >= 14) return 'bg-rose-100 text-rose-800 ring-1 ring-rose-200';
  if (days >= 7) return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  return 'bg-sky-100 text-sky-800 ring-1 ring-sky-200';
}

function formatStudentName(firstName?: string | null, lastName?: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || '—';
}

const UNIVERSAL_SEARCH_HEADER_STYLE =
  'border-slate-200 bg-gradient-to-r from-slate-100/80 to-slate-50/50 text-slate-900';
const UNIVERSAL_SEARCH_PANEL_STYLE = 'border-slate-200/80 shadow-slate-100/50';

function getStageTitle(
  onboardingStage?: string | null,
  onBoardingComplete?: boolean,
): string {
  if (onBoardingComplete) {
    return 'Onboarding Complete';
  }
  const step = STUDENT_ONBOARDING_STEPS.find((s) => s.id === onboardingStage);
  return step?.title ?? onboardingStage ?? '—';
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

function formatTabLabel(title: string, count: number | undefined): string {
  return `${title} (${count ?? 0})`;
}

export function StudentsPage() {
  const [activeTab, setActiveTab] = useState<AdminStudentListTabId>('parent');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  useEffect(() => {
    setPage(1);
  }, [activeTab, appliedSearch]);

  const searchArg = appliedSearch || undefined;
  const isUniversalSearch = Boolean(searchArg);

  function handleSearch() {
    setAppliedSearch(searchInput.trim());
  }

  function handleTabChange(tab: AdminStudentListTabId) {
    setActiveTab(tab);
    setAppliedSearch('');
    setSearchInput('');
  }

  function handleSearchInputChange(value: string) {
    setSearchInput(value);
    if (!value.trim()) {
      setAppliedSearch('');
    }
  }

  const listInput = useMemo(() => {
    if (isUniversalSearch) {
      return {
        page,
        pageSize: PAGE_SIZE,
        search: searchArg,
      };
    }

    if (activeTab === 'complete') {
      return {
        completedOnly: true,
        page,
        pageSize: PAGE_SIZE,
      };
    }

    return {
      onboardingStage: activeTab,
      page,
      pageSize: PAGE_SIZE,
    };
  }, [activeTab, isUniversalSearch, page, searchArg]);

  const { data: countsData } = useQuery<AdminStudentStageCountsData>(
    GET_ADMIN_STUDENT_STAGE_COUNTS,
    { fetchPolicy: 'cache-and-network' },
  );

  const { data, loading, error } = useQuery<AdminStudentsData>(GET_ADMIN_STUDENTS, {
    variables: { input: listInput },
    fetchPolicy: 'cache-and-network',
  });

  const stageCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of countsData?.adminStudentStageCounts ?? []) {
      map.set(row.stage, row.count);
    }
    return map;
  }, [countsData]);

  const result = data?.adminStudents;
  const items = result?.items ?? [];
  const totalPages = result?.totalPages ?? 0;
  const totalCount = result?.totalCount ?? 0;
  const activeHeaderStyle = isUniversalSearch
    ? UNIVERSAL_SEARCH_HEADER_STYLE
    : STAGE_HEADER_STYLES[activeTab];
  const activePanelStyle = isUniversalSearch
    ? UNIVERSAL_SEARCH_PANEL_STYLE
    : ACTIVE_PANEL_STYLES[activeTab];

  return (
    <div>
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-sky-50/80 to-violet-50/80 px-6 py-5">
        <h1 className="text-2xl font-semibold text-primary">Students</h1>
        <p className="mt-1 text-sm text-muted">
          Browse students by onboarding stage. Search by name, email, or mobile.
        </p>
      </div>

      <div className="mt-6 w-full max-w-md">
        <label htmlFor="student-search" className="mb-1 block text-sm font-medium text-primary">
          Search Student
        </label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sky-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
              </svg>
            </span>
            <input
              id="student-search"
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search by name, email, or mobile"
              className="h-11 w-full rounded-xl border border-sky-200/80 bg-gradient-to-r from-white to-sky-50/50 pl-10 pr-4 text-sm text-primary shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="h-11 shrink-0 rounded-xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-800 shadow-sm transition hover:border-sky-400 hover:bg-sky-50"
          >
            Search
          </button>
        </div>
      </div>

      {!isUniversalSearch && (
        <div
          className="mt-6 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Student onboarding stages"
        >
          {ADMIN_STUDENT_LIST_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? ACTIVE_TAB_STYLES[tab.id]
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {formatTabLabel(tab.title, stageCounts.get(tab.id))}
              </button>
            );
          })}
        </div>
      )}

      <div
        className={`mt-6 overflow-hidden rounded-xl border bg-white shadow-md ${activePanelStyle}`}
      >
        {loading && (
          <p className="bg-gradient-to-r from-sky-50/50 to-violet-50/50 p-6 text-sm text-muted">
            Loading students…
          </p>
        )}

        {error && (
          <p className="p-6 text-sm text-red-600" role="alert">
            Could not load students. Please try again.
          </p>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 text-sm text-muted">
            {isUniversalSearch
              ? 'No students match your search.'
              : activeTab === 'complete'
                ? 'No students with completed onboarding.'
                : 'No students at this stage.'}
          </p>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wide ${activeHeaderStyle}`}>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Mobile</th>
                  {isUniversalSearch && <th className="px-4 py-3">Stage</th>}
                  <th className="px-4 py-3">Days in stage</th>
                </tr>
              </thead>
              <tbody>
                {items.map((student, index) => (
                  <tr
                    key={student.id}
                    className={
                      index % 2 === 0
                        ? 'bg-white hover:bg-sky-50/40'
                        : 'bg-slate-50/60 hover:bg-sky-50/50'
                    }
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-primary">#{student.id}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-primary">
                      {formatStudentName(student.firstName, student.lastName)}
                    </td>
                    <td className="px-4 py-3 text-muted">{student.email ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">
                      {formatMobile(
                        student.mobile,
                        student.mobileCountryCode,
                        student.mobileNumber,
                      )}
                    </td>
                    {isUniversalSearch && (
                      <td className="px-4 py-3 text-muted">
                        {getStageTitle(student.onboardingStage, student.onBoardingComplete)}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${daysInStageBadgeClass(student.daysInStage)}`}
                      >
                        {student.daysInStage}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && totalPages > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle bg-gradient-to-r from-slate-50/80 to-white px-4 py-3">
            <p className="text-sm text-muted">
              Page {page} of {totalPages} ({totalCount} student{totalCount === 1 ? '' : 's'})
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
