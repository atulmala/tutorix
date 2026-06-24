import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_ADMIN_ORDER_DETAIL } from '@tutorix/shared-graphql';

type OrderItemRow = {
  id: number;
  itemType: string;
  description: string;
  quantity: number;
  unitRateInr: number;
  lineSubtotalInr: number;
  discountInr: number;
  waiverApplied: boolean;
  cgstInr: number;
  sgstInr: number;
  igstInr: number;
  gstRatePercent: number;
  referenceType: string;
  referenceId: number;
  fulfillmentStatus: string;
};

type PaymentAttemptRow = {
  id: number;
  provider: string;
  gatewayOrderId: string;
  gatewayPaymentId?: string | null;
  amountInr: number;
  status: string;
  gatewaySettlementId?: string | null;
  settlementUtr?: string | null;
  settledAt?: string | null;
};

type AdminOrderDetailData = {
  adminOrderDetail: {
    id: number;
    orderNumber: string;
    status: string;
    paymentMethod?: string | null;
    payerRole: string;
    source: string;
    subtotalInr: number;
    discountInr: number;
    taxInr: number;
    pointsRedeemed: number;
    pointsValueInr: number;
    amountDueInr: number;
    amountPaidInr: number;
    billingName?: string | null;
    billingEmail?: string | null;
    billingPhone?: string | null;
    billingStateCode?: string | null;
    paidAt?: string | null;
    createdDate: string;
    payer: {
      userId: number;
      name?: string | null;
      email?: string | null;
      mobile?: string | null;
    };
    items: OrderItemRow[];
    invoice?: {
      id: number;
      invoiceNumber: string;
      orderNumber: string;
      amountDueInr: number;
      amountPaidInr: number;
      paymentMethod: string;
      issuedAt: string;
      pdfUrl?: string | null;
    } | null;
    paymentAttempts: PaymentAttemptRow[];
  };
};

function formatInr(amount: number): string {
  return `₹${amount}`;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function paymentMethodLabel(method?: string | null): string {
  if (!method) return '—';
  if (method === 'waived') return 'Waived — no payment required';
  if (method === 'gateway') return 'Online payment';
  if (method === 'points') return 'Tutorix points';
  return 'Mixed (gateway + points)';
}

function lineTotal(item: OrderItemRow): number {
  return Math.max(
    0,
    item.lineSubtotalInr - item.discountInr + item.cgstInr + item.sgstInr + item.igstInr,
  );
}

function isGatewayOrder(paymentMethod?: string | null): boolean {
  return paymentMethod === 'gateway' || paymentMethod === 'mixed';
}

function pickPaidGatewayAttempt(
  attempts: PaymentAttemptRow[],
): PaymentAttemptRow | undefined {
  return attempts.find((attempt) => attempt.status === 'paid') ?? attempts[0];
}

function settlementField(value?: string | null): string {
  return value?.trim() ? value : 'Not yet available';
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-subtle bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const parsedId = Number(orderId);

  const { data, loading, error } = useQuery<AdminOrderDetailData>(
    GET_ADMIN_ORDER_DETAIL,
    {
      variables: { orderId: parsedId },
      skip: !Number.isFinite(parsedId),
      fetchPolicy: 'cache-and-network',
    },
  );

  const order = data?.adminOrderDetail;
  const paidGatewayAttempt = order
    ? pickPaidGatewayAttempt(order.paymentAttempts)
    : undefined;
  const isSettled = Boolean(paidGatewayAttempt?.gatewaySettlementId?.trim());

  if (!Number.isFinite(parsedId)) {
    return <p className="text-sm text-red-600">Invalid order ID.</p>;
  }

  if (loading && !order) {
    return <p className="text-sm text-muted">Loading order…</p>;
  }

  if (error || !order) {
    return (
      <div>
        <Link to="/orders" className="text-sm font-medium text-sky-700 hover:underline">
          ← Back to orders
        </Link>
        <p className="mt-4 text-sm text-red-600" role="alert">
          Could not load order details.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/orders" className="text-sm font-medium text-sky-700 hover:underline">
            ← Back to orders
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-primary">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted capitalize">
            {order.status.replace('_', ' ')} · {paymentMethodLabel(order.paymentMethod)}
          </p>
        </div>
        <div className="text-right text-sm text-muted">
          <div>Paid at: {formatDate(order.paidAt)}</div>
          <div>Created: {formatDate(order.createdDate)}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Payer">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">User ID</dt>
              <dd className="font-medium text-primary">{order.payer.userId}</dd>
            </div>
            <div>
              <dt className="text-muted">Role</dt>
              <dd className="font-medium capitalize text-primary">{order.payerRole}</dd>
            </div>
            <div>
              <dt className="text-muted">Name</dt>
              <dd className="font-medium text-primary">{order.payer.name ?? order.billingName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="font-medium text-primary">{order.payer.email ?? order.billingEmail ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Phone</dt>
              <dd className="font-medium text-primary">{order.payer.mobile ?? order.billingPhone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Billing state</dt>
              <dd className="font-medium text-primary">{order.billingStateCode ?? '—'}</dd>
            </div>
          </dl>
        </Section>

        <Section title="Totals">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-medium">{formatInr(order.subtotalInr)}</dd>
            </div>
            <div>
              <dt className="text-muted">Discount</dt>
              <dd className="font-medium">{formatInr(order.discountInr)}</dd>
            </div>
            <div>
              <dt className="text-muted">Tax</dt>
              <dd className="font-medium">{formatInr(order.taxInr)}</dd>
            </div>
            {order.pointsValueInr > 0 ? (
              <div>
                <dt className="text-muted">Points redeemed</dt>
                <dd className="font-medium">{formatInr(order.pointsValueInr)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted">Amount due</dt>
              <dd className="font-semibold text-primary">{formatInr(order.amountDueInr)}</dd>
            </div>
            <div>
              <dt className="text-muted">Amount paid</dt>
              <dd className="font-semibold text-primary">{formatInr(order.amountPaidInr)}</dd>
            </div>
          </dl>
        </Section>
      </div>

      <Section title="Line items">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-subtle text-xs uppercase text-muted">
              <tr>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Rate</th>
                <th className="py-2 pr-4">Discount</th>
                <th className="py-2 pr-4">Waiver</th>
                <th className="py-2 pr-4">Line total</th>
                <th className="py-2">Fulfillment</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-subtle last:border-0">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{item.description}</div>
                    <div className="text-xs text-muted">{item.itemType}</div>
                  </td>
                  <td className="py-3 pr-4">{item.quantity}</td>
                  <td className="py-3 pr-4">{formatInr(item.unitRateInr)}</td>
                  <td className="py-3 pr-4">{formatInr(item.discountInr)}</td>
                  <td className="py-3 pr-4">{item.waiverApplied ? 'Yes' : 'No'}</td>
                  <td className="py-3 pr-4">{formatInr(lineTotal(item))}</td>
                  <td className="py-3 capitalize">{item.fulfillmentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Invoice">
          {order.invoice ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted">Invoice number</dt>
                <dd className="font-medium">{order.invoice.invoiceNumber}</dd>
              </div>
              <div>
                <dt className="text-muted">Issued</dt>
                <dd>{formatDate(order.invoice.issuedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted">Net payable</dt>
                <dd className="font-medium">{formatInr(order.invoice.amountDueInr)}</dd>
              </div>
              {order.invoice.pdfUrl ? (
                <a
                  href={order.invoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-sm font-semibold text-sky-700 hover:underline"
                >
                  Download PDF
                </a>
              ) : (
                <p className="text-sm text-muted">PDF not available (storage not configured or pending).</p>
              )}
            </dl>
          ) : order.status === 'paid' ? (
            <p className="text-sm text-muted">No invoice record found for this order.</p>
          ) : (
            <p className="text-sm text-muted">Invoice will be generated when the order is paid.</p>
          )}
        </Section>

        <Section title="Gateway">
          {!isGatewayOrder(order.paymentMethod) ? (
            <p className="text-sm text-muted">
              No gateway payment (waived or zero amount).
            </p>
          ) : !paidGatewayAttempt ? (
            <p className="text-sm text-muted">No payment attempts recorded.</p>
          ) : (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted">Provider</dt>
                <dd className="font-medium capitalize">{paidGatewayAttempt.provider}</dd>
              </div>
              <div>
                <dt className="text-muted">Gateway order ID</dt>
                <dd className="font-medium break-all">{paidGatewayAttempt.gatewayOrderId}</dd>
              </div>
              {paidGatewayAttempt.gatewayPaymentId ? (
                <div>
                  <dt className="text-muted">Gateway payment ID</dt>
                  <dd className="font-medium break-all">{paidGatewayAttempt.gatewayPaymentId}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted">Amount</dt>
                <dd className="font-medium">
                  {formatInr(paidGatewayAttempt.amountInr)} · {paidGatewayAttempt.status}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Settled</dt>
                <dd className="font-medium">{isSettled ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-muted">Settlement ID</dt>
                <dd className="font-medium break-all">
                  {settlementField(paidGatewayAttempt.gatewaySettlementId)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">UTR no.</dt>
                <dd className="font-medium break-all">
                  {settlementField(paidGatewayAttempt.settlementUtr)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Settled at</dt>
                <dd>
                  {paidGatewayAttempt.settledAt
                    ? formatDate(paidGatewayAttempt.settledAt)
                    : 'Not yet available'}
                </dd>
              </div>
            </dl>
          )}
        </Section>
      </div>
    </div>
  );
}
