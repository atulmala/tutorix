import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  ADMIN_APPROVE_POST_CLASS_REFUND_CLAIM,
  ADMIN_REJECT_POST_CLASS_REFUND_CLAIM,
  GET_ADMIN_POST_CLASS_REFUND_CLAIMS,
} from '@tutorix/shared-graphql';
import {
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
} from '@tutorix/shared-utils';

type ClaimRow = {
  id: number;
  studentId: number;
  studentName: string;
  tutorId: number;
  tutorName: string;
  offeringLabel: string;
  classStartsAt: string;
  durationMinutes: number;
  deliveryMode: string;
  reasonLabel: string;
  refundMethod: string;
  previewAmountInr: number;
  tutorResponseStatus: string;
  tutorDeclineComment?: string | null;
  adminStatus: string;
  studentStatus: string;
};

function formatClassTime(row: ClaimRow): string {
  const start = new Date(row.classStartsAt);
  return `${formatIstBookingDateLabel(start)}, ${formatIstBookingTimeRange(
    start,
    row.durationMinutes,
  )}`;
}

export function PostClassRefundClaimsPage() {
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const { data, loading, refetch } = useQuery(GET_ADMIN_POST_CLASS_REFUND_CLAIMS, {
    variables: { input: { page, pageSize: 20 } },
    fetchPolicy: 'network-only',
  });

  const [approve] = useMutation(ADMIN_APPROVE_POST_CLASS_REFUND_CLAIM, {
    onCompleted: () => void refetch(),
  });
  const [reject] = useMutation(ADMIN_REJECT_POST_CLASS_REFUND_CLAIM, {
    onCompleted: () => {
      setRejectId(null);
      setRejectComment('');
      void refetch();
    },
  });

  const items: ClaimRow[] = data?.adminPostClassRefundClaims?.items ?? [];
  const total = data?.adminPostClassRefundClaims?.total ?? 0;
  const pageSize = data?.adminPostClassRefundClaims?.pageSize ?? 20;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Post class refund claims</h1>
      <p className="mt-1 text-sm text-slate-600">
        Review student claims after concluded classes. Approve to process refunds.
      </p>

      {loading && items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">Tutor</th>
                <th className="px-3 py-2">Offering</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Tutor</th>
                <th className="px-3 py-2">Student status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium">
                    <Link to={`/students/${row.studentId}`} className="text-primary underline">
                      {row.studentName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatClassTime(row)}</td>
                  <td className="px-3 py-2">
                    <Link to={`/tutors/${row.tutorId}`} className="text-primary underline">
                      {row.tutorName}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.offeringLabel}</td>
                  <td className="px-3 py-2 capitalize">{row.deliveryMode}</td>
                  <td className="px-3 py-2 max-w-[200px]">{row.reasonLabel}</td>
                  <td className="px-3 py-2">
                    <span className="capitalize">{row.tutorResponseStatus.replace(/_/g, ' ')}</span>
                    {row.tutorDeclineComment ? (
                      <p className="mt-1 text-xs text-slate-500">{row.tutorDeclineComment}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 capitalize">{row.studentStatus.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2">
                    {row.adminStatus === 'pending' ? (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="rounded bg-green-700 px-2 py-1 text-xs font-semibold text-white"
                          onClick={() =>
                            void approve({ variables: { claimId: row.id } })
                          }
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="rounded bg-red-700 px-2 py-1 text-xs font-semibold text-white"
                          onClick={() => setRejectId(row.id)}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="capitalize text-slate-500">{row.adminStatus}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejectId != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow">
            <h2 className="font-bold">Reject claim #{rejectId}</h2>
            <textarea
              className="mt-3 w-full rounded border p-2 text-sm"
              rows={3}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Optional comment for student and tutor"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded bg-red-700 px-3 py-1.5 text-sm font-semibold text-white"
                onClick={() =>
                  void reject({
                    variables: { claimId: rejectId, comment: rejectComment || null },
                  })
                }
              >
                Confirm reject
              </button>
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm"
                onClick={() => setRejectId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-3 text-sm">
        <button
          type="button"
          disabled={page <= 1}
          className="rounded border px-2 py-1 disabled:opacity-40"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span>
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          className="rounded border px-2 py-1 disabled:opacity-40"
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
