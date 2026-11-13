import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  ADMIN_EXECUTE_PAYMENT_DISBURSEMENT,
  ADMIN_SYNC_PAYMENT_DISBURSEMENT,
  GET_ADMIN_PAYMENT_DISBURSEMENT_DETAIL,
  GET_ADMIN_PAYMENT_DISBURSEMENTS,
} from '@tutorix/shared-graphql';

type DisbursementRow = {
  id: number;
  kind: string;
  status: string;
  payeeName: string;
  amountInr: number;
  classCancellationRefundRequestId?: number | null;
  tutorId?: number | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  failureReason?: string | null;
};

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function kindLabel(kind: string): string {
  if (kind === 'student_refund_wallet') return 'Student wallet refund';
  if (kind === 'student_refund_gateway') return 'Student gateway refund';
  if (kind === 'tutor_bank_payout') return 'Tutor bank payout';
  return kind;
}

function razorpayPaymentDashboardUrl(gatewayPaymentId: string): string {
  return `https://dashboard.razorpay.com/app/payments/${encodeURIComponent(gatewayPaymentId)}`;
}

export function PaymentProcessingPage() {
  const [searchParams] = useSearchParams();
  const initialRefundRequestId = searchParams.get('refundRequestId');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [kindFilter, setKindFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listInput = useMemo(
    () => ({
      status: statusFilter || undefined,
      kind: kindFilter || undefined,
      refundRequestId: initialRefundRequestId
        ? Number(initialRefundRequestId)
        : undefined,
      page,
      pageSize: 20,
    }),
    [statusFilter, kindFilter, initialRefundRequestId, page],
  );

  const { data, loading, refetch } = useQuery(GET_ADMIN_PAYMENT_DISBURSEMENTS, {
    variables: { input: listInput },
    fetchPolicy: 'network-only',
  });

  const { data: detailData, refetch: refetchDetail } = useQuery(
    GET_ADMIN_PAYMENT_DISBURSEMENT_DETAIL,
    {
      variables: { id: selectedId ?? 0 },
      skip: selectedId == null,
      fetchPolicy: 'network-only',
    },
  );

  const [executePayment, { loading: executing }] = useMutation(
    ADMIN_EXECUTE_PAYMENT_DISBURSEMENT,
    {
      onCompleted: () => {
        void refetch();
        if (selectedId != null) void refetchDetail();
      },
    },
  );

  const [syncPayment, { loading: syncing }] = useMutation(ADMIN_SYNC_PAYMENT_DISBURSEMENT, {
    onCompleted: () => {
      void refetch();
      if (selectedId != null) void refetchDetail();
    },
  });

  const items: DisbursementRow[] = data?.adminPaymentDisbursements?.items ?? [];
  const total = data?.adminPaymentDisbursements?.total ?? 0;
  const pageSize = data?.adminPaymentDisbursements?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const detail = detailData?.adminPaymentDisbursementDetail;

  const runExecute = async (id: number) => {
    setActionError(null);
    try {
      await executePayment({ variables: { id } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not execute payment');
    }
  };

  const runSync = async (id: number) => {
    setActionError(null);
    try {
      await syncPayment({ variables: { id } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not sync status');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Payment processing</h1>
        <p className="mt-1 text-sm text-muted">
          Execute wallet credits, payment gateway refunds, and tutor bank payouts from this hub.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-subtle px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="ready">Ready</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          className="rounded-lg border border-subtle px-3 py-2 text-sm"
          value={kindFilter}
          onChange={(e) => {
            setKindFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All kinds</option>
          <option value="student_refund_wallet">Student wallet</option>
          <option value="student_refund_gateway">Student gateway</option>
          <option value="tutor_bank_payout">Tutor bank</option>
        </select>
      </div>

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

      <div className="overflow-hidden rounded-xl border border-subtle bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-subtle bg-gray-50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Payee</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No disbursements in queue.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-subtle last:border-0">
                  <td className="px-4 py-3">{row.payeeName}</td>
                  <td className="px-4 py-3">{kindLabel(row.kind)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatInr(row.amountInr)}</td>
                  <td className="px-4 py-3 capitalize">{row.status}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {row.classCancellationRefundRequestId != null ? (
                      <Link
                        to="/class-cancellations"
                        className="text-primary underline"
                      >
                        Refund #{row.classCancellationRefundRequestId}
                      </Link>
                    ) : row.tutorId != null ? (
                      <>
                        Tutor #{row.tutorId}
                        {row.periodStartDate && row.periodEndDate
                          ? ` · ${row.periodStartDate}–${row.periodEndDate}`
                          : ''}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary underline"
                      onClick={() => setSelectedId(row.id)}
                    >
                      Details
                    </button>
                    {(row.status === 'ready' || row.status === 'failed') && (
                      <button
                        type="button"
                        disabled={executing}
                        className="rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-white disabled:bg-gray-300"
                        onClick={() => void runExecute(row.id)}
                      >
                        Pay
                      </button>
                    )}
                    {(row.status === 'processing' ||
                      row.kind === 'student_refund_gateway') && (
                      <button
                        type="button"
                        disabled={syncing}
                        className="rounded-lg border border-subtle px-2 py-1 text-xs font-semibold disabled:opacity-50"
                        onClick={() => void runSync(row.id)}
                      >
                        Sync
                      </button>
                    )}
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
          <h2 className="text-lg font-semibold text-primary">Disbursement #{detail.id}</h2>
          <p>
            {kindLabel(detail.kind)} · {formatInr(detail.amountInr)} ·{' '}
            <span className="capitalize">{detail.status}</span>
          </p>
          {detail.failureReason ? (
            <p className="text-red-600">{detail.failureReason}</p>
          ) : null}
          {detail.gatewayPayoutId && detail.payoutProvider === 'cashfree' ? (
            <p>Cashfree transfer: {detail.gatewayPayoutId}</p>
          ) : detail.gatewayPayoutId ? (
            <p>RazorpayX payout: {detail.gatewayPayoutId}</p>
          ) : null}
          {detail.gatewayUtr ? <p>UTR: {detail.gatewayUtr}</p> : null}
          {detail.gatewayRefunds
            ?.filter((refund: { provider?: string | null }) => refund.provider === 'cashfree')
            .map(
              (refund: {
                id: number;
                gatewayPaymentId: string;
                gatewayRefundId: string;
                amountInr: number;
                cashfreeRefundStatus?: string | null;
              }) => (
                <p key={refund.id}>
                  Cashfree refund {refund.gatewayRefundId} on payment {refund.gatewayPaymentId} ·{' '}
                  {formatInr(refund.amountInr)}
                  {refund.cashfreeRefundStatus ? ` · ${refund.cashfreeRefundStatus}` : ''}
                </p>
              ),
            )}
          {detail.gatewayRefunds
            ?.filter((refund: { provider?: string | null }) => refund.provider !== 'cashfree')
            .map(
            (refund: {
              id: number;
              gatewayPaymentId: string;
              gatewayRefundId: string;
              amountInr: number;
              razorpayRefundStatus?: string | null;
            }) => (
              <p key={refund.id}>
                Refund {refund.gatewayRefundId} on{' '}
                <a
                  href={razorpayPaymentDashboardUrl(refund.gatewayPaymentId)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  {refund.gatewayPaymentId}
                </a>{' '}
                · {formatInr(refund.amountInr)}
                {refund.razorpayRefundStatus ? ` · ${refund.razorpayRefundStatus}` : ''}
              </p>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
