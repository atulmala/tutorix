import React, { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  MY_TUTOR_EARNINGS_SUMMARY,
  MY_TUTOR_MONTHLY_EARNINGS,
  MY_TUTOR_PAYOUT_PERIOD_DETAIL,
  MY_TUTOR_PAYOUT_TRANSFERS,
} from '@tutorix/shared-graphql';
import { formatInr, istCurrentYearMonth, istMonthBounds } from '@tutorix/shared-utils';

type EarningsTab = 'monthly' | 'paid';

type TutorPayoutLineItem = {
  orderItemId: number;
  studentName: string;
  classesInBooking: number;
  rateInr: number;
  concludedInRange: number;
  netPayoutInr: number;
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

function monthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseMonthValue(value: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) {
    return null;
  }
  return { year: Number(m[1]), month: Number(m[2]) };
}

export const TutorEarningsPage: React.FC<TutorEarningsPageProps> = ({
  onBack,
  onAddBankDetails,
}) => {
  const defaultMonth = istCurrentYearMonth();
  const [monthDraft, setMonthDraft] = useState(monthValue(defaultMonth.year, defaultMonth.month));
  const [tab, setTab] = useState<EarningsTab>('monthly');

  const parsed = parseMonthValue(monthDraft) ?? defaultMonth;
  const monthBounds = istMonthBounds(parsed.year, parsed.month);

  const { data: summaryData, loading: summaryLoading } = useQuery(MY_TUTOR_EARNINGS_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: monthlyData, loading: monthlyLoading } = useQuery(MY_TUTOR_MONTHLY_EARNINGS, {
    variables: { input: { year: parsed.year, month: parsed.month } },
    fetchPolicy: 'cache-and-network',
    skip: tab !== 'monthly',
  });

  const monthly = monthlyData?.myTutorMonthlyEarnings;
  const detailRange = monthly
    ? { startDate: monthly.startDate, endDate: monthly.endDate }
    : monthBounds
      ? { startDate: monthBounds.startDate, endDate: monthBounds.endDate }
      : null;

  const { data: detailData, loading: detailLoading } = useQuery(MY_TUTOR_PAYOUT_PERIOD_DETAIL, {
    variables: { input: detailRange ?? { startDate: '', endDate: '' } },
    skip: !detailRange || tab !== 'monthly',
    fetchPolicy: 'network-only',
  });

  const { data: transfersData, loading: transfersLoading } = useQuery<MyTutorPayoutTransfersData>(
    MY_TUTOR_PAYOUT_TRANSFERS,
    {
      fetchPolicy: 'cache-and-network',
      skip: tab !== 'paid',
    },
  );

  const helpCopy = useMemo(
    () => [
      'You are paid monthly for concluded paid classes (demos are excluded).',
      'Classes stay in the student dispute window for two days after the class ends; then they count as payable.',
      'Classes under dispute or from earlier months may appear in the next settlement.',
      'Platform commission, online fees, and payment processing are deducted from gross earnings.',
    ],
    [],
  );

  const summary = summaryData?.myTutorEarningsSummary;
  const activeDetail = detailData?.myTutorPayoutPeriodDetail;
  const transfers = transfersData?.myTutorPayoutTransfers ?? [];

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
      <p className="mt-1 text-sm text-slate-500">Monthly estimates until a transfer is marked paid.</p>

      <div className="mt-5 flex rounded-xl bg-slate-100 p-1">
        {(['monthly', 'paid'] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              tab === key ? 'bg-white text-[#143055] shadow-sm' : 'text-slate-500'
            }`}
            onClick={() => setTab(key)}
          >
            {key === 'monthly' ? 'By month' : 'Paid to bank'}
          </button>
        ))}
      </div>

      {tab === 'monthly' ? (
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Month (IST)</span>
            <input
              type="month"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={monthDraft}
              onChange={(e) => setMonthDraft(e.target.value)}
            />
          </label>

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

          {(monthlyLoading || summaryLoading) && !monthly ? (
            <p className="text-sm text-slate-500">Loading earnings…</p>
          ) : null}

          {monthly ? (
            <>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#2563eb]">Payable</p>
                <p className="mt-2 text-3xl font-extrabold tabular-nums text-[#143055]">
                  {formatInr(monthly.payable.totalNetPayoutInr)}
                </p>
                <p className="mt-1 text-sm text-slate-600">{monthly.monthLabel}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {monthly.payable.concludedClassCount}{' '}
                  {monthly.payable.concludedClassCount === 1 ? 'class' : 'classes'}
                </p>
                <p className="mt-3 text-xs leading-5 text-slate-500">{monthly.settlementNote}</p>
              </div>

              {monthly.inDisputeWindow && monthly.inDisputeWindow.concludedClassCount > 0 ? (
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-extrabold uppercase text-slate-500">In dispute window</p>
                  <p className="mt-2 text-xl font-extrabold tabular-nums text-[#143055]">
                    {formatInr(monthly.inDisputeWindow.totalNetPayoutInr)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {monthly.inDisputeWindow.concludedClassCount} class(es) — students can still raise a
                    refund claim
                  </p>
                </div>
              ) : null}

              {monthly.underDispute.concludedClassCount > 0 ? (
                <div className="rounded-2xl bg-white p-4 ring-1 ring-amber-100">
                  <p className="text-xs font-extrabold uppercase text-amber-800">Under dispute</p>
                  <p className="mt-2 text-xl font-extrabold tabular-nums text-[#143055]">
                    {formatInr(monthly.underDispute.totalNetPayoutInr)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {monthly.underDispute.concludedClassCount} class(es) — paid only after the claim is
                    resolved
                  </p>
                </div>
              ) : null}

              {monthly.carriedForward.concludedClassCount > 0 ? (
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-extrabold uppercase text-slate-500">Carried to next payout</p>
                  <p className="mt-2 text-xl font-extrabold tabular-nums text-[#143055]">
                    {formatInr(monthly.carriedForward.totalNetPayoutInr)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {monthly.carriedForward.concludedClassCount} class(es) from earlier months
                  </p>
                </div>
              ) : null}

              <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                <h2 className="text-sm font-extrabold text-[#143055]">Breakdown · {monthly.monthLabel}</h2>
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
                      <div className="flex justify-between gap-4 border-t border-slate-100 pt-2">
                        <dt className="font-bold text-[#143055]">Net (all classes in range)</dt>
                        <dd className="font-extrabold tabular-nums text-[#143055]">
                          {formatInr(activeDetail.totalNetPayoutInr)}
                        </dd>
                      </div>
                    </dl>
                    {activeDetail.items.length > 0 ? (
                      <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                        {activeDetail.items.map((row: TutorPayoutLineItem) => (
                          <li key={row.orderItemId} className="text-sm">
                            <p className="font-bold text-[#143055]">{row.studentName}</p>
                            <p className="text-slate-600">
                              {row.concludedInRange} of {row.classesInBooking} classes
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
            </>
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