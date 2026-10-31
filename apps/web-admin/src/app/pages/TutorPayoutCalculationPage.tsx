import React, { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { defaultTutorPayoutPeriodIstDates } from '@tutorix/shared-utils';
import { GET_ADMIN_TUTOR_PAYOUT_CALCULATION } from '@tutorix/shared-graphql';

const PAGE_SIZE = 20;

type PayoutRow = {
  orderItemId: number;
  tutorName: string;
  studentName: string;
  classesInBooking: number;
  rateInr: number;
  concludedInRange: number;
  grossInr: number;
  commissionPercent: number;
  commissionInr: number;
  onlineChargesInr: number;
  totalDeductionsInr: number;
  netPayoutInr: number;
};

type PayoutData = {
  adminTutorPayoutCalculation: {
    items: PayoutRow[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    totalGrossInr: number;
    totalCommissionInr: number;
    totalOnlineChargesInr: number;
    totalDeductionsInr: number;
    totalNetPayoutInr: number;
  };
};

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function TutorPayoutCalculationPage() {
  const defaultPeriod = useMemo(() => defaultTutorPayoutPeriodIstDates(), []);
  const [startDateDraft, setStartDateDraft] = useState(defaultPeriod.startDate);
  const [endDateDraft, setEndDateDraft] = useState(defaultPeriod.endDate);
  const [tutorSearchDraft, setTutorSearchDraft] = useState('');
  const [applied, setApplied] = useState({
    startDate: defaultPeriod.startDate,
    endDate: defaultPeriod.endDate,
    tutorSearch: '',
  });
  const [page, setPage] = useState(1);

  const input = useMemo(
    () => ({
      startDate: applied.startDate,
      endDate: applied.endDate,
      tutorSearch: applied.tutorSearch.trim() || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [applied, page],
  );

  const { data, loading, error, refetch } = useQuery<PayoutData>(
    GET_ADMIN_TUTOR_PAYOUT_CALCULATION,
    {
      variables: { input },
      fetchPolicy: 'network-only',
    },
  );

  const result = data?.adminTutorPayoutCalculation;

  function applyFilters() {
    setApplied({
      startDate: startDateDraft,
      endDate: endDateDraft,
      tutorSearch: tutorSearchDraft,
    });
    setPage(1);
  }

  function resetToDefaultPeriod() {
    const period = defaultTutorPayoutPeriodIstDates();
    setStartDateDraft(period.startDate);
    setEndDateDraft(period.endDate);
    setApplied((prev) => ({
      ...prev,
      startDate: period.startDate,
      endDate: period.endDate,
    }));
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Tutor payout calculation</h1>
        <p className="mt-1 text-sm text-muted">
          Concluded classes are counted by IST session end time. Default range uses a one-week
          lag (through {defaultPeriod.endDate} when opened today).
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-subtle bg-white p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-primary">From (IST)</span>
            <input
              type="date"
              className="rounded-md border border-subtle px-3 py-2"
              value={startDateDraft}
              onChange={(e) => setStartDateDraft(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-primary">To (IST)</span>
            <input
              type="date"
              className="rounded-md border border-subtle px-3 py-2"
              value={endDateDraft}
              onChange={(e) => setEndDateDraft(e.target.value)}
            />
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
            <span className="font-medium text-primary">Tutor search</span>
            <input
              type="search"
              placeholder="Name, email, or mobile"
              className="rounded-md border border-subtle px-3 py-2"
              value={tutorSearchDraft}
              onChange={(e) => setTutorSearchDraft(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            onClick={applyFilters}
          >
            Apply
          </button>
          <button
            type="button"
            className="rounded-md border border-subtle px-4 py-2 text-sm font-medium text-primary"
            onClick={resetToDefaultPeriod}
          >
            Default week
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-subtle bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-subtle bg-slate-50 text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Tutor</th>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Classes in booking</th>
              <th className="px-3 py-2">Rate</th>
              <th className="px-3 py-2">Concluded classes</th>
              <th className="px-3 py-2">Gross</th>
              <th className="px-3 py-2">Commission</th>
              <th className="px-3 py-2">Online charges</th>
              <th className="px-3 py-2">Total deductions</th>
              <th className="px-3 py-2">Net payout</th>
            </tr>
          </thead>
          <tbody>
            {loading && !result ? (
              <tr>
                <td className="px-3 py-6 text-muted" colSpan={10}>
                  Loading…
                </td>
              </tr>
            ) : null}
            {!loading && result && result.items.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted" colSpan={10}>
                  No concluded classes in this range.
                </td>
              </tr>
            ) : null}
            {result?.items.map((row) => (
              <tr key={row.orderItemId} className="border-b border-subtle last:border-0">
                <td className="px-3 py-2">{row.tutorName}</td>
                <td className="px-3 py-2">{row.studentName}</td>
                <td className="px-3 py-2">{row.classesInBooking}</td>
                <td className="px-3 py-2">{formatInr(row.rateInr)}</td>
                <td className="px-3 py-2">{row.concludedInRange}</td>
                <td className="px-3 py-2">{formatInr(row.grossInr)}</td>
                <td className="px-3 py-2">
                  {formatInr(row.commissionInr)}
                  <span className="ml-1 text-xs text-muted">({row.commissionPercent}%)</span>
                </td>
                <td className="px-3 py-2">{formatInr(row.onlineChargesInr)}</td>
                <td className="px-3 py-2">{formatInr(row.totalDeductionsInr)}</td>
                <td className="px-3 py-2 font-medium">{formatInr(row.netPayoutInr)}</td>
              </tr>
            ))}
          </tbody>
          {result && result.totalCount > 0 ? (
            <tfoot className="border-t border-subtle bg-slate-50 font-medium">
              <tr>
                <td className="px-3 py-3" colSpan={4}>
                  Totals ({result.totalCount} booking{result.totalCount === 1 ? '' : 's'})
                </td>
                <td className="px-3 py-3">—</td>
                <td className="px-3 py-3">{formatInr(result.totalGrossInr)}</td>
                <td className="px-3 py-3">{formatInr(result.totalCommissionInr)}</td>
                <td className="px-3 py-3">{formatInr(result.totalOnlineChargesInr)}</td>
                <td className="px-3 py-3">{formatInr(result.totalDeductionsInr)}</td>
                <td className="px-3 py-3">{formatInr(result.totalNetPayoutInr)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {result && result.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted">
            Page {result.page} of {result.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-subtle px-3 py-1 disabled:opacity-40"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md border border-subtle px-3 py-1 disabled:opacity-40"
              disabled={page >= result.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {result ? (
        <p className="text-xs text-muted">
          Gross before deductions: {formatInr(result.totalGrossInr)}.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void refetch()}
          >
            Refresh
          </button>
        </p>
      ) : null}
    </div>
  );
}
