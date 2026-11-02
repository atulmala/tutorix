import React, { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  MY_TUTOR_EARNINGS_SUMMARY,
  MY_TUTOR_PAYOUT_PERIOD_DETAIL,
  MY_TUTOR_PAYOUT_TRANSFERS,
} from '@tutorix/shared-graphql';
import { formatInr, formatIstDateRangeLabel } from '@tutorix/shared-utils';

type PeriodTotals = {
  startDate: string;
  endDate: string;
  concludedClassCount: number;
  totalNetPayoutInr: number;
};

type TutorPayoutLineItem = {
  orderItemId: number;
  studentName: string;
  classesInBooking: number;
  rateInr: number;
  concludedInRange: number;
  netPayoutInr: number;
};

type MyTutorPayoutPeriodDetailData = {
  myTutorPayoutPeriodDetail: {
    totalGrossInr: number;
    totalCommissionInr: number;
    totalOnlineChargesInr: number;
    totalPaymentGatewayChargesInr: number;
    totalNetPayoutInr: number;
    items: TutorPayoutLineItem[];
  };
};

type TutorPayoutTransferItem = {
  id: number;
  paidAt: string;
  amountInr: number;
  utrReference?: string | null;
};

type MyTutorPayoutTransfersData = {
  myTutorPayoutTransfers: TutorPayoutTransferItem[];
};

type TutorEarningsPageProps = {
  onBack?: () => void;
  onAddBankDetails?: () => void;
};

type EarningsTab = 'upcoming' | 'paid';

function periodLabel(period: PeriodTotals | null | undefined): string {
  if (!period) {
    return '';
  }
  return formatIstDateRangeLabel(period.startDate, period.endDate) ?? `${period.startDate} – ${period.endDate}`;
}

export const TutorEarningsPage: React.FC<TutorEarningsPageProps> = ({
  onBack,
  onAddBankDetails,
}) => {
  const [tab, setTab] = useState<EarningsTab>('upcoming');
  const [detailPeriod, setDetailPeriod] = useState<{ startDate: string; endDate: string } | null>(
    null,
  );

  const { data: summaryData, loading: summaryLoading } = useQuery(MY_TUTOR_EARNINGS_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: transfersData, loading: transfersLoading } = useQuery<MyTutorPayoutTransfersData>(
    MY_TUTOR_PAYOUT_TRANSFERS,
    {
      fetchPolicy: 'cache-and-network',
      skip: tab !== 'paid',
    },
  );

  const summary = summaryData?.myTutorEarningsSummary;
  const nextPayout = summary?.nextPayout;
  const inHold = summary?.inHold;

  const detailInput = detailPeriod ?? nextPayout ?? null;
  const { data: detailData, loading: detailLoading } = useQuery<MyTutorPayoutPeriodDetailData>(
    MY_TUTOR_PAYOUT_PERIOD_DETAIL,
    {
      variables: {
        input: {
          startDate: detailInput?.startDate ?? '',
          endDate: detailInput?.endDate ?? '',
        },
      },
      skip: !detailInput || tab !== 'upcoming',
      fetchPolicy: 'network-only',
    },
  );

  const activeDetail = detailData?.myTutorPayoutPeriodDetail;
  const transfers = transfersData?.myTutorPayoutTransfers ?? [];

  const showDetailFor = detailPeriod ?? nextPayout;

  const helpCopy = useMemo(
    () => [
      'You are paid for concluded paid classes (free demos are not included).',
      'After a class ends, earnings stay in a short hold before they are included in the next bank transfer.',
      'Platform commission, online class fees, and payment processing are deducted from gross earnings.',
    ],
    [],
  );

  return (
    <div className="w-full max-w-xl pb-10">
      {onBack ? (
        <button
          type="button"
          className="mb-4 text-sm font-semibold text-[#2563eb]"
          onClick={onBack}
        >
          ← Back
        </button>
      ) : null}
      <h1 className="text-[26px] font-extrabold text-[#143055]">Earnings</h1>
      <p className="mt-1 text-sm text-slate-500">Estimated amounts until a transfer is marked paid.</p>

      <div className="mt-5 flex rounded-xl bg-slate-100 p-1">
        {(['upcoming', 'paid'] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              tab === key ? 'bg-white text-[#143055] shadow-sm' : 'text-slate-500'
            }`}
            onClick={() => {
              setTab(key);
              setDetailPeriod(null);
            }}
          >
            {key === 'upcoming' ? 'On the way' : 'Paid to bank'}
          </button>
        ))}
      </div>

      {summaryLoading && !summary ? (
        <p className="mt-6 text-sm text-slate-500">Loading earnings…</p>
      ) : null}

      {tab === 'upcoming' ? (
        <div className="mt-5 space-y-4">
          {summary && !summary.bankDetailsComplete ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-bold text-amber-900">Add bank details to receive payouts</p>
              {onAddBankDetails ? (
                <button
                  type="button"
                  className="mt-2 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-extrabold text-white"
                  onClick={onAddBankDetails}
                >
                  Add bank details
                </button>
              ) : null}
            </div>
          ) : null}

          {nextPayout ? (
            <button
              type="button"
              className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100"
              onClick={() =>
                setDetailPeriod({ startDate: nextPayout.startDate, endDate: nextPayout.endDate })
              }
            >
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#2563eb]">
                Next bank transfer
              </p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums text-[#143055]">
                {formatInr(nextPayout.totalNetPayoutInr)}
              </p>
              <p className="mt-1 text-sm text-slate-600">{periodLabel(nextPayout)} (IST)</p>
              <p className="mt-1 text-xs text-slate-500">
                {nextPayout.concludedClassCount}{' '}
                {nextPayout.concludedClassCount === 1 ? 'class' : 'classes'} · Estimated
              </p>
            </button>
          ) : null}

          {inHold && inHold.concludedClassCount > 0 ? (
            <button
              type="button"
              className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100"
              onClick={() =>
                setDetailPeriod({ startDate: inHold.startDate, endDate: inHold.endDate })
              }
            >
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                Still in hold
              </p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-[#143055]">
                {formatInr(inHold.totalNetPayoutInr)}
              </p>
              <p className="mt-1 text-sm text-slate-600">{periodLabel(inHold)} (IST)</p>
              <p className="mt-1 text-xs text-slate-500">
                {inHold.concludedClassCount}{' '}
                {inHold.concludedClassCount === 1 ? 'class' : 'classes'} · Estimated
              </p>
            </button>
          ) : null}

          {nextPayout &&
          nextPayout.concludedClassCount === 0 &&
          (!inHold || inHold.concludedClassCount === 0) ? (
            <p className="text-sm leading-6 text-slate-500">
              No payable classes in the current periods yet. Complete paid classes to start earning.
            </p>
          ) : null}

          {showDetailFor ? (
            <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
              <h2 className="text-sm font-extrabold text-[#143055]">
                Breakdown · {periodLabel(showDetailFor)}
              </h2>
              {detailLoading && !activeDetail ? (
                <p className="mt-3 text-sm text-slate-500">Loading breakdown…</p>
              ) : activeDetail ? (
                <>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Gross earnings</dt>
                      <dd className="font-semibold tabular-nums text-[#143055]">
                        {formatInr(activeDetail.totalGrossInr)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Commission</dt>
                      <dd className="tabular-nums text-slate-700">
                        −{formatInr(activeDetail.totalCommissionInr)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Online class charges</dt>
                      <dd className="tabular-nums text-slate-700">
                        −{formatInr(activeDetail.totalOnlineChargesInr)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Payment processing</dt>
                      <dd className="tabular-nums text-slate-700">
                        −{formatInr(activeDetail.totalPaymentGatewayChargesInr)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-2">
                      <dt className="font-bold text-[#143055]">Net payout</dt>
                      <dd className="font-extrabold tabular-nums text-[#143055]">
                        {formatInr(activeDetail.totalNetPayoutInr)}
                      </dd>
                    </div>
                  </dl>
                  {activeDetail.items.length > 0 ? (
                    <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      {activeDetail.items.map((row) => (
                        <li key={row.orderItemId} className="text-sm">
                          <p className="font-bold text-[#143055]">{row.studentName}</p>
                          <p className="text-slate-600">
                            {row.concludedInRange} of {row.classesInBooking} classes ·{' '}
                            {formatInr(row.rateInr)}/class
                          </p>
                          <p className="mt-0.5 font-semibold tabular-nums text-[#143055]">
                            Net {formatInr(row.netPayoutInr)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl bg-blue-50 px-4 py-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wide text-[#1d4ed8]">
              How payouts work
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6 text-[#143055]">
              {helpCopy.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div className="mt-5">
          {transfersLoading && transfers.length === 0 ? (
            <p className="text-sm text-slate-500">Loading transfers…</p>
          ) : transfers.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-100">
              <p className="text-sm font-bold text-[#143055]">No bank transfers yet</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                When Tutorix sends your first payout, the amount, date, and UTR will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {transfers.map((tx) => (
                <li key={tx.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <p className="text-lg font-extrabold tabular-nums text-[#143055]">
                    {formatInr(tx.amountInr)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {new Date(tx.paidAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  {tx.utrReference ? (
                    <p className="mt-1 text-xs text-slate-500">UTR · {tx.utrReference}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
