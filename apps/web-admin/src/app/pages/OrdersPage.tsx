import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_ADMIN_ORDERS } from '@tutorix/shared-graphql';

const PAGE_SIZE = 20;

type OrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded';

type PaymentMethod = 'waived' | 'gateway' | 'points' | 'mixed';

type AdminOrderListItem = {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod?: PaymentMethod | null;
  payerRole: string;
  source: string;
  userId: number;
  payerName?: string | null;
  payerEmail?: string | null;
  subtotalInr: number;
  discountInr: number;
  amountDueInr: number;
  amountPaidInr: number;
  paidAt?: string | null;
  createdDate: string;
};

type AdminOrdersData = {
  adminOrders: {
    items: AdminOrderListItem[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const STATUS_OPTIONS: { value: '' | OrderStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending_payment', label: 'Pending payment' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'draft', label: 'Draft' },
];

const PAYMENT_METHOD_OPTIONS: { value: '' | PaymentMethod; label: string }[] = [
  { value: '', label: 'All payment methods' },
  { value: 'waived', label: 'Waived' },
  { value: 'gateway', label: 'Gateway' },
  { value: 'points', label: 'Points' },
  { value: 'mixed', label: 'Mixed' },
];

function formatInr(amount: number): string {
  return `₹${amount}`;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function paymentMethodLabel(method?: PaymentMethod | null): string {
  if (!method) return '—';
  if (method === 'waived') return 'Waived';
  if (method === 'gateway') return 'Gateway';
  if (method === 'points') return 'Points';
  return 'Mixed';
}

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const [paymentMethod, setPaymentMethod] = useState<'' | PaymentMethod>('');
  const [zeroAmountOnly, setZeroAmountOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');

  const input = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(status ? { status } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(zeroAmountOnly ? { zeroAmountOnly: true } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [page, status, paymentMethod, zeroAmountOnly, search],
  );

  const { data, loading, error } = useQuery<AdminOrdersData>(GET_ADMIN_ORDERS, {
    variables: { input },
    fetchPolicy: 'cache-and-network',
  });

  const result = data?.adminOrders;
  const items = result?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Orders</h1>
        <p className="mt-1 text-sm text-muted">
          Commerce orders including waived and paid registration and PT fees.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-subtle bg-white p-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | OrderStatus);
              setPage(1);
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

        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Payment method
          <select
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value as '' | PaymentMethod);
              setPage(1);
            }}
            className="h-10 min-w-[180px] rounded-lg border border-subtle px-3 text-sm text-primary"
          >
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 pb-2 text-sm text-primary">
          <input
            type="checkbox"
            checked={zeroAmountOnly}
            onChange={(e) => {
              setZeroAmountOnly(e.target.checked);
              setPage(1);
            }}
          />
          Zero amount only
        </label>

        <label className="flex flex-1 min-w-[220px] flex-col gap-1 text-xs font-medium text-muted">
          Search
          <div className="flex gap-2">
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearch(searchDraft);
                  setPage(1);
                }
              }}
              placeholder="Order #, email, name…"
              className="h-10 flex-1 rounded-lg border border-subtle px-3 text-sm text-primary"
            />
            <button
              type="button"
              onClick={() => {
                setSearch(searchDraft);
                setPage(1);
              }}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
            >
              Search
            </button>
          </div>
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          Could not load orders.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-subtle bg-white">
        {loading && items.length === 0 ? (
          <p className="p-6 text-sm text-muted">Loading orders…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted">No orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-subtle bg-gray-50 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Payer</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Paid at</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-subtle last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        to={`/orders/${row.id}`}
                        className="font-medium text-sky-700 hover:underline"
                      >
                        {row.orderNumber}
                      </Link>
                      {row.paymentMethod === 'waived' || row.amountDueInr === 0 ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Waived
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.payerName ?? '—'}</div>
                      <div className="text-xs text-muted">{row.payerEmail ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{row.payerRole}</td>
                    <td className="px-4 py-3 capitalize">{row.status.replace('_', ' ')}</td>
                    <td className="px-4 py-3">{paymentMethodLabel(row.paymentMethod)}</td>
                    <td className="px-4 py-3">{formatInr(row.amountDueInr)}</td>
                    <td className="px-4 py-3">{formatInr(row.amountPaidInr)}</td>
                    <td className="px-4 py-3">{formatDate(row.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {result && result.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted">
            Page {result.page} of {result.totalPages} ({result.totalCount} orders)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-subtle px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= result.totalPages}
              onClick={() => setPage((p) => p + 1)}
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
