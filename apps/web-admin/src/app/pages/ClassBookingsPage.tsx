import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_ADMIN_CLASS_BOOKINGS } from '@tutorix/shared-graphql';

const PAGE_SIZE = 20;

type ClassCreditStatus = 'unscheduled' | 'scheduled' | 'cancelled';

type AdminClassBookingGroupedLine = {
  tutorId: number;
  tutorName: string;
  offeringLabel: string;
  deliveryMode: 'online' | 'offline';
  classCount: number;
  scheduledCount: number;
  unscheduledCount: number;
  cancelledCount: number;
  unitRateInr: number;
  linePaidInr: number;
};

type AdminClassBookingCheckoutItem = {
  orderId: number;
  orderNumber: string;
  studentId: number;
  studentName: string;
  studentEmail?: string | null;
  purchasedAt: string;
  classCount: number;
  tutorCount: number;
  amountDueInr: number;
  amountPaidInr: number;
  lines: AdminClassBookingGroupedLine[];
};

type AdminClassBookingsData = {
  adminClassBookings: {
    items: AdminClassBookingCheckoutItem[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const STATUS_OPTIONS: { value: '' | ClassCreditStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'unscheduled', label: 'Unscheduled' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatInr(amount: number): string {
  return `₹${amount}`;
}

function groupedStatusLabel(line: AdminClassBookingGroupedLine): string {
  const parts: string[] = [];
  if (line.scheduledCount > 0) {
    parts.push(
      line.scheduledCount === line.classCount
        ? 'Scheduled'
        : `${line.scheduledCount} scheduled`,
    );
  }
  if (line.unscheduledCount > 0) {
    parts.push(
      line.unscheduledCount === line.classCount
        ? 'Unscheduled'
        : `${line.unscheduledCount} unscheduled`,
    );
  }
  if (line.cancelledCount > 0) {
    parts.push(
      line.cancelledCount === line.classCount
        ? 'Cancelled'
        : `${line.cancelledCount} cancelled`,
    );
  }
  return parts.join(', ');
}

export function ClassBookingsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | ClassCreditStatus>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [tutorSearch, setTutorSearch] = useState('');
  const [studentDraft, setStudentDraft] = useState('');
  const [tutorDraft, setTutorDraft] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const input = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(status ? { status } : {}),
      ...(studentSearch.trim() ? { studentSearch: studentSearch.trim() } : {}),
      ...(tutorSearch.trim() ? { tutorSearch: tutorSearch.trim() } : {}),
    }),
    [page, status, studentSearch, tutorSearch],
  );

  const { data, loading, error } = useQuery<AdminClassBookingsData>(
    GET_ADMIN_CLASS_BOOKINGS,
    {
      variables: { input },
      fetchPolicy: 'cache-and-network',
    },
  );

  const result = data?.adminClassBookings;
  const items = result?.items ?? [];

  const runSearch = () => {
    setStudentSearch(studentDraft);
    setTutorSearch(tutorDraft);
    setPage(1);
    setExpandedOrderId(null);
  };

  const toggleExpanded = (orderId: number) => {
    setExpandedOrderId((current) => (current === orderId ? null : orderId));
  };

  const summaryColCount = 7;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Class bookings</h1>
        <p className="mt-1 text-sm text-muted">
          One row per checkout. Expand a row to see class hours and tutors.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-subtle bg-white p-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-muted">
          Student search
          <input
            type="search"
            value={studentDraft}
            onChange={(e) => setStudentDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                runSearch();
              }
            }}
            placeholder="Name, email, mobile…"
            className="h-10 rounded-lg border border-subtle px-3 text-sm text-primary"
          />
        </label>

        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-muted">
          Tutor search
          <input
            type="search"
            value={tutorDraft}
            onChange={(e) => setTutorDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                runSearch();
              }
            }}
            placeholder="Name, email, mobile…"
            className="h-10 rounded-lg border border-subtle px-3 text-sm text-primary"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | ClassCreditStatus);
              setPage(1);
              setExpandedOrderId(null);
            }}
            className="h-10 min-w-[160px] rounded-lg border border-subtle px-3 text-sm text-primary"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={runSearch}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
        >
          Search
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          Could not load class bookings.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-subtle bg-white">
        {loading && items.length === 0 ? (
          <p className="p-6 text-sm text-muted">Loading bookings…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted">No class bookings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-subtle bg-gray-50 text-xs uppercase text-muted">
                <tr>
                  <th className="w-10 px-2 py-3" aria-label="Expand" />
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Classes</th>
                  <th className="px-4 py-3">Tutors</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Purchased</th>
                </tr>
              </thead>
              <tbody>
                {items.map((checkout) => {
                  const isExpanded = expandedOrderId === checkout.orderId;
                  return (
                    <React.Fragment key={checkout.orderId}>
                      <tr
                        className="cursor-pointer border-b border-subtle hover:bg-gray-50"
                        onClick={() => toggleExpanded(checkout.orderId)}
                      >
                        <td className="px-2 py-3 text-center text-muted">
                          <span aria-hidden>{isExpanded ? '▼' : '▶'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/orders/${checkout.orderId}`}
                            className="font-medium text-sky-700 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {checkout.orderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/students/${checkout.studentId}`}
                            className="font-medium text-sky-700 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {checkout.studentName}
                          </Link>
                          {checkout.studentEmail ? (
                            <div className="text-xs text-muted">{checkout.studentEmail}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{checkout.classCount}</td>
                        <td className="px-4 py-3">{checkout.tutorCount}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-primary">
                            {formatInr(checkout.amountDueInr)}
                          </span>
                          {checkout.amountPaidInr !== checkout.amountDueInr ? (
                            <div className="text-xs text-muted">
                              Paid {formatInr(checkout.amountPaidInr)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{formatDate(checkout.purchasedAt)}</td>
                      </tr>
                      {isExpanded ? (
                        <tr className="border-b border-subtle bg-gray-50/80">
                          <td colSpan={summaryColCount} className="px-4 py-3">
                            <table className="min-w-full text-left text-sm">
                              <thead className="text-xs uppercase text-muted">
                                <tr>
                                  <th className="px-3 py-2">Tutor</th>
                                  <th className="px-3 py-2">Subject</th>
                                  <th className="px-3 py-2">Mode</th>
                                  <th className="px-3 py-2">Classes</th>
                                  <th className="px-3 py-2">Rate / class</th>
                                  <th className="px-3 py-2">Paid</th>
                                  <th className="px-3 py-2">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {checkout.lines.map((line) => (
                                  <tr
                                    key={`${line.tutorId}-${line.offeringLabel}-${line.deliveryMode}`}
                                    className="border-t border-subtle"
                                  >
                                    <td className="px-3 py-2">
                                      <Link
                                        to={`/tutors/${line.tutorId}`}
                                        className="font-medium text-sky-700 hover:underline"
                                      >
                                        {line.tutorName}
                                      </Link>
                                    </td>
                                    <td className="px-3 py-2">{line.offeringLabel}</td>
                                    <td className="px-3 py-2 capitalize">{line.deliveryMode}</td>
                                    <td className="px-3 py-2 font-medium text-primary">
                                      {line.classCount}
                                    </td>
                                    <td className="px-3 py-2">{formatInr(line.unitRateInr)}</td>
                                    <td className="px-3 py-2 font-medium text-primary">
                                      {formatInr(line.linePaidInr)}
                                    </td>
                                    <td className="px-3 py-2">{groupedStatusLabel(line)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {result && result.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted">
            Page {result.page} of {result.totalPages} ({result.totalCount} checkouts)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                setExpandedOrderId(null);
              }}
              className="rounded-lg border border-subtle px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= result.totalPages}
              onClick={() => {
                setPage((p) => p + 1);
                setExpandedOrderId(null);
              }}
              className="rounded-lg border border-subtle px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
