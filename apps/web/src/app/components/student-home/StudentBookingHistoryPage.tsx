import React, { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { STUDENT_CLASS_BOOKINGS } from '@tutorix/shared-graphql';
import {
  formatIstBookingDateLabel,
  formatTutorBookingAmount,
  tutorBookingConclusionLabel,
  tutorBookingModeLabel,
  tutorBookingSchedulingLabel,
} from '@tutorix/shared-utils';

const PAGE_SIZE = 20;

type StudentClassBookingRow = {
  orderItemId: number;
  bookedAt: string;
  tutorId: number;
  tutorName: string;
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

type StudentClassBookingsData = {
  studentClassBookings: {
    items: StudentClassBookingRow[];
    tutors: { id: number; name: string }[];
    subjects: string[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const fieldClass =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#143055]';

export const StudentBookingHistoryPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [tutorId, setTutorId] = useState('');
  const [offeringLabel, setOfferingLabel] = useState('');

  const input = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(tutorId ? { tutorId: Number(tutorId) } : {}),
      ...(offeringLabel ? { offeringLabel } : {}),
    }),
    [page, tutorId, offeringLabel],
  );

  const { data, loading, error } = useQuery<StudentClassBookingsData>(STUDENT_CLASS_BOOKINGS, {
    variables: { input },
    fetchPolicy: 'cache-and-network',
  });

  const result = data?.studentClassBookings;
  const items = result?.items ?? [];
  const tutors = result?.tutors ?? [];
  const subjects = result?.subjects ?? [];

  return (
    <div className="w-full space-y-4">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Booking history</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-[20px] bg-white p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">
          Tutor
          <select
            value={tutorId}
            onChange={(event) => {
              setTutorId(event.target.value);
              setPage(1);
            }}
            aria-label="Tutor"
            className={fieldClass}
          >
            <option value="">All</option>
            {tutors.map((tutor) => (
              <option key={tutor.id} value={String(tutor.id)}>
                {tutor.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">
          Subject
          <select
            value={offeringLabel}
            onChange={(event) => {
              setOfferingLabel(event.target.value);
              setPage(1);
            }}
            aria-label="Subject"
            className={fieldClass}
          >
            <option value="">All</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>
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
                  <th className="px-4 py-3 font-semibold">Tutor</th>
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
                    <td className="px-4 py-3">{row.tutorName}</td>
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
