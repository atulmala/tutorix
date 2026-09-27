import React from 'react';
import { useQuery } from '@apollo/client';
import { MY_ORDER_INVOICE } from '@tutorix/shared-graphql';
import { formatInr } from '@tutorix/shared-utils';

type CartCheckoutSuccessSectionProps = {
  purchaseOrderId?: number;
  purchaseOrderNumber?: string;
  onScheduleNow: () => void;
  onLater: () => void;
};

export const CartCheckoutSuccessSection: React.FC<CartCheckoutSuccessSectionProps> = ({
  purchaseOrderId,
  purchaseOrderNumber,
  onScheduleNow,
  onLater,
}) => {
  const { data, loading } = useQuery(MY_ORDER_INVOICE, {
    variables: { orderId: purchaseOrderId ?? 0 },
    skip: purchaseOrderId == null,
    fetchPolicy: 'network-only',
  });
  const invoice = data?.myOrderInvoice;

  return (
    <div className="w-full max-w-xl space-y-4">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Classes purchased</h1>
      <p className="text-sm text-slate-500">
        You can pick 1-hour slots now or come back later from home.
      </p>

      {purchaseOrderNumber ? (
        <section className="rounded-[20px] bg-white p-5 text-sm text-[#143055]">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Order</p>
          <p className="mt-1 font-extrabold">{purchaseOrderNumber}</p>
          {loading ? (
            <p className="mt-3 text-slate-500">Loading invoice…</p>
          ) : invoice ? (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              <p>
                <span className="text-slate-500">Invoice </span>
                <span className="font-semibold">{invoice.invoiceNumber}</span>
              </p>
              <p>
                <span className="text-slate-500">Paid </span>
                <span className="font-semibold">{formatInr(invoice.amountPaidInr)}</span>
              </p>
              {invoice.pdfUrl ? (
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block font-semibold text-[#2563eb] hover:underline"
                >
                  Download invoice PDF
                </a>
              ) : (
                <p className="text-slate-500">Invoice PDF will be available shortly.</p>
              )}
            </div>
          ) : purchaseOrderId ? (
            <p className="mt-3 text-slate-500">Your invoice is being prepared.</p>
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        onClick={onScheduleNow}
        className="w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
      >
        Schedule now
      </button>
      <button
        type="button"
        onClick={onLater}
        className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#143055]"
      >
        Later
      </button>
    </div>
  );
};
