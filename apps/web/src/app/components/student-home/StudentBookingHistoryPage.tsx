import React, { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { STUDENT_CLASS_BOOKINGS } from '@tutorix/shared-graphql';
import { formatIstBookingDateLabel, formatTutorBookingAmount } from '@tutorix/shared-utils';
import type { BookingScheduledClassesContext } from './StudentBookingScheduledClassesPage';

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
  cancellableCount: number;
  canCancel: boolean;
  linePaidInr: number;
  isDemo: boolean;
};

export type StudentBookingHistoryCancelPayload = {
  orderItemId: number;
  tutorName: string;
  offeringLabel: string;
  classCount: number;
  scheduledCount: number;
  unscheduledCount: number;
  concludedCount: number;
  cancelledCount: number;
  cancellableCount: number;
};

type StudentBookingHistoryPageProps = {
  onCancelBooking?: (booking: StudentBookingHistoryCancelPayload) => void;
  onScheduleBooking?: (orderItemId: number) => void;
  onViewScheduledClasses?: (booking: BookingScheduledClassesContext) => void;
};

function bookingCancelPayload(row: StudentClassBookingRow): StudentBookingHistoryCancelPayload {
  return {
    orderItemId: row.orderItemId,
    tutorName: row.tutorName,
    offeringLabel: row.offeringLabel,
    classCount: row.classCount,
    scheduledCount: row.scheduledCount,
    unscheduledCount: row.unscheduledCount,
    concludedCount: row.concludedCount,
    cancelledCount: row.cancelledCount,
    cancellableCount: row.cancellableCount,
  };
}

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

export const StudentBookingHistoryPage: React.FC<StudentBookingHistoryPageProps> = ({
  onCancelBooking,
  onScheduleBooking,
  onViewScheduledClasses,
}) => {
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

      {loading && items.length === 0 ? (
        <p className="text-sm text-slate-500">Loading bookings…</p>
      ) : !error && items.length === 0 ? (
        <p className="text-sm text-slate-500">No bookings found.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => (
            <li
              key={row.orderItemId}
              className="rounded-[18px] border-l-[5px] border-l-[#2563eb] bg-white px-4 py-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-extrabold text-[#2563eb]">
                  {formatIstBookingDateLabel(new Date(row.bookedAt))}
                </p>
                <p className="text-[22px] font-extrabold text-emerald-600">
                  {formatTutorBookingAmount(row.linePaidInr)}
                </p>
              </div>
              <p className="mt-1.5 text-[17px] font-extrabold text-[#0f2744]">
                Tutor · {row.tutorName}
              </p>
              <p className="mt-1 text-[15px] font-bold text-[#1d4ed8]">
                {row.offeringLabel}
                {row.isDemo ? (
                  <span className="ml-2 font-semibold text-slate-600">· Free demo</span>
                ) : null}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                Total classes booked:{' '}
                <span className="font-extrabold text-[#143055]">{row.classCount}</span>
              </p>
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm font-semibold text-slate-600">
                {row.scheduledCount > 0 && onViewScheduledClasses ? (
                  <button
                    type="button"
                    className="text-left text-slate-600"
                    onClick={() =>
                      onViewScheduledClasses({
                        orderItemId: row.orderItemId,
                        tutorName: row.tutorName,
                        offeringLabel: row.offeringLabel,
                      })
                    }
                  >
                    Scheduled:{' '}
                    <span className="font-extrabold text-[#2563eb] underline">
                      {row.scheduledCount}
                    </span>
                  </button>
                ) : (
                  <p>
                    Scheduled:{' '}
                    <span className="font-extrabold text-[#143055]">{row.scheduledCount}</span>
                  </p>
                )}
                <p>
                  Concluded:{' '}
                  <span className="font-extrabold text-[#143055]">{row.concludedCount}</span>
                </p>
              </div>
              {(row.unscheduledCount > 0 && onScheduleBooking) ||
              (row.canCancel && onCancelBooking) ? (
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {row.unscheduledCount > 0 && onScheduleBooking ? (
                    <button
                      type="button"
                      className="text-sm font-extrabold text-[#2563eb]"
                      onClick={() => onScheduleBooking(row.orderItemId)}
                    >
                      Schedule class
                    </button>
                  ) : null}
                  {row.canCancel && onCancelBooking ? (
                    <button
                      type="button"
                      className="text-sm font-extrabold text-red-600"
                      onClick={() => onCancelBooking(bookingCancelPayload(row))}
                    >
                      Cancel classes
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

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
