import React, { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { TUTOR_CLASS_BOOKINGS } from '@tutorix/shared-graphql';
import {
  formatIstBookingDateLabel,
  formatTutorBookingAmount,
  tutorBookingConclusionLabel,
  tutorBookingModeLabel,
  tutorBookingSchedulingLabel,
} from '@tutorix/shared-utils';

const PAGE_SIZE = 20;

type SchedulingStatus = '' | 'unscheduled' | 'scheduled' | 'partial' | 'cancelled';
type ConclusionStatus = '' | 'not_concluded' | 'partial' | 'concluded';

type TutorClassBookingRow = {
  orderItemId: number;
  bookedAt: string;
  studentName: string;
  offeringLabel: string;
  classCount: number;
  deliveryMode: string;
  schedulingStatus: string;
  conclusionStatus?: string | null;
  scheduledCount: number;
  unscheduledCount: number;
  cancelledCount: number;
  concludedCount: number;
  linePaidInr: number;
  isDemo: boolean;
};

type TutorClassBookingsData = {
  tutorClassBookings: {
    items: TutorClassBookingRow[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const SCHEDULING_OPTIONS: { value: SchedulingStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'unscheduled', label: 'Unscheduled' },
  { value: 'partial', label: 'Partially scheduled' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'cancelled', label: 'Cancelled' },
];

const CONCLUSION_OPTIONS: { value: ConclusionStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'not_concluded', label: 'Not concluded' },
  { value: 'partial', label: 'Partially concluded' },
  { value: 'concluded', label: 'Concluded' },
];

const fieldClass =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#143055]';

export const TutorBookingHistoryPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [studentDraft, setStudentDraft] = useState('');
  const [offeringDraft, setOfferingDraft] = useState('');
  const [schedulingDraft, setSchedulingDraft] = useState<SchedulingStatus>('');
  const [conclusionDraft, setConclusionDraft] = useState<ConclusionStatus>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [offeringSearch, setOfferingSearch] = useState('');
  const [schedulingStatus, setSchedulingStatus] = useState<SchedulingStatus>('');
  const [conclusionStatus, setConclusionStatus] = useState<ConclusionStatus>('');

  const input = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(studentSearch.trim() ? { studentSearch: studentSearch.trim() } : {}),
      ...(offeringSearch.trim() ? { offeringSearch: offeringSearch.trim() } : {}),
      ...(schedulingStatus ? { schedulingStatus } : {}),
      ...(conclusionStatus ? { conclusionStatus } : {}),
    }),
    [page, studentSearch, offeringSearch, schedulingStatus, conclusionStatus],
  );

  const { data, loading, error } = useQuery<TutorClassBookingsData>(TUTOR_CLASS_BOOKINGS, {
    variables: { input },
    fetchPolicy: 'cache-and-network',
  });

  const result = data?.tutorClassBookings;
  const items = result?.items ?? [];

  const runSearch = () => {
    setStudentSearch(studentDraft);
    setOfferingSearch(offeringDraft);
    setSchedulingStatus(schedulingDraft);
    setConclusionStatus(conclusionDraft);
    setPage(1);
  };

  return (
    <div className="w-full space-y-4">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Booking history</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-[20px] bg-white p-4">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">
          Student
          <input
            type="search"
            value={studentDraft}
            onChange={(event) => setStudentDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                runSearch();
              }
            }}
            placeholder="Email or mobile"
            aria-label="Student email or mobile"
            className={fieldClass}
          />
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">
          Offering
          <input
            type="search"
            value={offeringDraft}
            onChange={(event) => setOfferingDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                runSearch();
              }
            }}
            placeholder="Offering name"
            aria-label="Offering"
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
          Scheduling status
          <select
            value={schedulingDraft}
            onChange={(event) => setSchedulingDraft(event.target.value as SchedulingStatus)}
            aria-label="Scheduling status"
            className={`${fieldClass} min-w-[180px]`}
          >
            {SCHEDULING_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
          Conclusion status
          <select
            value={conclusionDraft}
            onChange={(event) => setConclusionDraft(event.target.value as ConclusionStatus)}
            aria-label="Conclusion status"
            className={`${fieldClass} min-w-[180px]`}
          >
            {CONCLUSION_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={runSearch}
          className="h-10 rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
        >
          Search
        </button>
      </div>

      {error ? (
        <p className="text-sm font-semibold text-red-600" role="alert">
          Could not load booking history.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-[20px] bg-white">
        {loading && items.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Loading bookings…</p>
        ) : !error && items.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No bookings found.</p>
        ) : items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Booking date</th>
                  <th className="px-4 py-3 font-semibold">Student name</th>
                  <th className="px-4 py-3 font-semibold">Offering</th>
                  <th className="px-4 py-3 font-semibold">Classes booked</th>
                  <th className="px-4 py-3 font-semibold">Mode</th>
                  <th className="px-4 py-3 font-semibold">Scheduling status</th>
                  <th className="px-4 py-3 font-semibold">Concluded status</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.orderItemId} className="border-b border-slate-50 text-[#143055]">
                    <td className="px-4 py-3">
                      {formatIstBookingDateLabel(new Date(row.bookedAt))}
                    </td>
                    <td className="px-4 py-3">{row.studentName}</td>
                    <td className="px-4 py-3">
                      {row.offeringLabel}
                      {row.isDemo ? (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
                          Free demo
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{row.classCount}</td>
                    <td className="px-4 py-3">{tutorBookingModeLabel(row.deliveryMode)}</td>
                    <td className="px-4 py-3">{tutorBookingSchedulingLabel(row)}</td>
                    <td className="px-4 py-3">{tutorBookingConclusionLabel(row)}</td>
                    <td className="px-4 py-3">{formatTutorBookingAmount(row.linePaidInr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {result && result.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {result.page} of {result.totalPages} ({result.totalCount} bookings)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-[#143055] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= result.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-[#143055] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
