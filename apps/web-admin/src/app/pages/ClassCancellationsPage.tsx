import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  ADMIN_PROCESS_CLASS_CANCELLATION_REFUND,
  ADMIN_RUN_CLASS_CANCELLATION_REFUND_BATCH,
  GET_ADMIN_CLASS_CANCELLATION_REFUND_DETAIL,
  GET_ADMIN_CLASS_CANCELLATION_REFUNDS,
} from '@tutorix/shared-graphql';

type Tab = 'student' | 'tutor';

type RefundListItem = {
  id: number;
  studentId: number;
  studentName: string;
  tutorId?: number | null;
  tutorName: string;
  offeringLabel: string;
  classCount: number;
  amountInr: number;
  refundMethod: string;
  payoutStatus: string;
  aiStatus: string;
  aiRejectionReason?: string | null;
  aiSummary?: string | null;
  initiatedAt: string;
  orderId?: number | null;
};

function formatAiStatusLabel(status: string): string {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}

function aiStatusHoverReason(row: {
  aiStatus: string;
  aiSummary?: string | null;
  aiRejectionReason?: string | null;
}): string | undefined {
  if (row.aiStatus === 'pending') {
    return 'Awaiting AI analysis';
  }
  return row.aiRejectionReason ?? row.aiSummary ?? undefined;
}

function AiStatusBadge({
  aiStatus,
  aiSummary,
  aiRejectionReason,
}: {
  aiStatus: string;
  aiSummary?: string | null;
  aiRejectionReason?: string | null;
}) {
  const label = formatAiStatusLabel(aiStatus);
  const reason = aiStatusHoverReason({ aiStatus, aiSummary, aiRejectionReason });
  const colorClass =
    aiStatus === 'approved'
      ? 'text-green-700'
      : aiStatus === 'rejected'
        ? 'text-red-700'
        : 'text-amber-700';

  return (
    <span
      className={`cursor-default font-medium capitalize ${colorClass} ${reason ? 'underline decoration-dotted' : ''}`}
      title={reason}
    >
      {label}
    </span>
  );
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function ClassCancellationsPage() {
  const [tab, setTab] = useState<Tab>('student');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  const listInput = useMemo(
    () => ({
      initiatedBy: tab,
      page,
      pageSize: 20,
    }),
    [tab, page],
  );

  const { data, loading, refetch } = useQuery(GET_ADMIN_CLASS_CANCELLATION_REFUNDS, {
    variables: { input: listInput },
    fetchPolicy: 'network-only',
  });

  const { data: detailData, refetch: refetchDetail } = useQuery(
    GET_ADMIN_CLASS_CANCELLATION_REFUND_DETAIL,
    {
      variables: { requestId: selectedId ?? 0 },
      skip: selectedId == null,
      fetchPolicy: 'network-only',
    },
  );

  const [processRefund, { loading: processing }] = useMutation(
    ADMIN_PROCESS_CLASS_CANCELLATION_REFUND,
    {
      onCompleted: () => {
        void refetch();
        if (selectedId != null) {
          void refetchDetail();
        }
      },
    },
  );

  const [runAiBatch, { loading: batchRunning }] = useMutation(
    ADMIN_RUN_CLASS_CANCELLATION_REFUND_BATCH,
    {
      onCompleted: (result) => {
        const stats = result.adminRunClassCancellationRefundAnalysisBatch;
        setBatchMessage(
          `AI batch finished: ${stats.analyzed} analyzed, ${stats.gatewaySynced} gateway syncs` +
            (stats.resetForReanalysis > 0
              ? ` (${stats.resetForReanalysis} re-queued)`
              : ''),
        );
        void refetch();
        if (selectedId != null) {
          void refetchDetail();
        }
      },
      onError: (err) => {
        setBatchMessage(err.message);
      },
    },
  );

  const items: RefundListItem[] = data?.adminClassCancellationRefundRequests?.items ?? [];
  const total = data?.adminClassCancellationRefundRequests?.total ?? 0;
  const pageSize = data?.adminClassCancellationRefundRequests?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const detail = detailData?.adminClassCancellationRefundRequestDetail;

  const handleProcess = async (requestId: number) => {
    setProcessError(null);
    try {
      await processRefund({ variables: { requestId } });
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Could not process refund');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Class cancellation</h1>
        <p className="mt-1 text-sm text-muted">
          Review cancellation refunds, AI advisory status, and process payouts.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={batchRunning}
          onClick={() => {
            setBatchMessage(null);
            void runAiBatch({ variables: { reanalyzePendingPayouts: true } });
          }}
          className="rounded-lg border border-subtle bg-white px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
        >
          {batchRunning ? 'Running AI batch…' : 'Run AI batch'}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('student');
            setPage(1);
            setSelectedId(null);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'student' ? 'bg-primary text-white' : 'bg-white text-primary border border-subtle'
          }`}
        >
          Student cancellations
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('tutor');
            setPage(1);
            setSelectedId(null);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'tutor' ? 'bg-primary text-white' : 'bg-white text-primary border border-subtle'
          }`}
        >
          Tutor cancellations
        </button>
      </div>

      {processError ? <p className="text-sm text-red-600">{processError}</p> : null}
      {batchMessage ? <p className="text-sm text-muted">{batchMessage}</p> : null}

      <div className="overflow-hidden rounded-xl border border-subtle bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-subtle bg-gray-50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Tutor</th>
              <th className="px-4 py-3">Offering</th>
              <th className="px-4 py-3">Classes</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Refund mode</th>
              <th className="px-4 py-3">Payout</th>
              <th className="px-4 py-3">AI</th>
              <th className="px-4 py-3">Initiated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted">
                  No refund requests yet.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-subtle last:border-0">
                  <td className="px-4 py-3">
                    <Link to={`/students/${row.studentId}`} className="text-primary underline">
                      {row.studentName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {row.tutorId ? (
                      <Link to={`/tutors/${row.tutorId}`} className="text-primary underline">
                        {row.tutorName}
                      </Link>
                    ) : (
                      row.tutorName
                    )}
                  </td>
                  <td className="px-4 py-3">{row.offeringLabel}</td>
                  <td className="px-4 py-3 tabular-nums">{row.classCount}</td>
                  <td className="px-4 py-3 tabular-nums">{formatInr(row.amountInr)}</td>
                  <td className="px-4 py-3">{row.refundMethod}</td>
                  <td className="px-4 py-3">{row.payoutStatus}</td>
                  <td className="px-4 py-3">
                    <AiStatusBadge
                      aiStatus={row.aiStatus}
                      aiSummary={row.aiSummary}
                      aiRejectionReason={row.aiRejectionReason}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.initiatedAt)}</td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary underline"
                      onClick={() => setSelectedId(row.id)}
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      disabled={
                        processing ||
                        row.payoutStatus === 'completed' ||
                        row.payoutStatus === 'processing'
                      }
                      className="rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-white disabled:bg-gray-300"
                      onClick={() => void handleProcess(row.id)}
                    >
                      Process refund
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">
          Page {page} of {totalPages} ({total} total)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-subtle px-3 py-1 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-subtle px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {selectedId != null && detail ? (
        <div className="rounded-xl border border-subtle bg-white p-4 text-sm space-y-2">
          <h2 className="text-lg font-semibold text-primary">Request #{detail.id}</h2>
          {detail.orderId ? (
            <p>
              Order:{' '}
              <Link to={`/orders/${detail.orderId}`} className="text-primary underline">
                #{detail.orderId}
              </Link>
            </p>
          ) : null}
          {detail.breakdownText ? (
            <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs">{detail.breakdownText}</pre>
          ) : null}
          <p>
            AI:{' '}
            <AiStatusBadge
              aiStatus={detail.aiStatus}
              aiSummary={detail.aiSummary}
              aiRejectionReason={detail.aiRejectionReason}
            />
          </p>
          {detail.aiChecksJson ? (
            <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs">{detail.aiChecksJson}</pre>
          ) : null}
          <p>Credit IDs: {detail.creditIds.join(', ')}</p>
          {detail.failureReason ? (
            <p className="text-red-600">Failure: {detail.failureReason}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
