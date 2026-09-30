import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { CANCEL_CLASS_CREDITS, MY_CLASS_CREDITS, MY_WALLET } from '@tutorix/shared-graphql';
import {
  canChangeScheduledClass,
  formatIstBookingDateLabel,
  groupUnscheduledClassCredits,
} from '@tutorix/shared-utils';

export type StudentClassCredit = {
  id: number;
  tutorId: number;
  offeringId: number;
  tutorOfferingId: number;
  tutorName: string;
  offeringLabel: string;
  deliveryMode: 'online' | 'offline';
  status: 'unscheduled' | 'scheduled' | 'cancelled';
  enrollmentId?: number | null;
  startsAt?: string | Date | null;
  refundableInr?: number;
  isDemo?: boolean;
};

function canChangeScheduledCredit(credit: StudentClassCredit): boolean {
  return (
    credit.status === 'scheduled' &&
    canChangeScheduledClass(credit.startsAt, credit.deliveryMode)
  );
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

type StudentClassCreditsPageProps = {
  onSchedule: (credits: StudentClassCredit[]) => void;
};

export const StudentClassCreditsPage: React.FC<StudentClassCreditsPageProps> = ({
  onSchedule,
}) => {
  const [pending, setPending] = useState<StudentClassCredit[] | null>(null);
  const [cancelCount, setCancelCount] = useState(1);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelCredits, { loading: cancelling }] = useMutation(CANCEL_CLASS_CREDITS, {
    refetchQueries: [{ query: MY_CLASS_CREDITS }, { query: MY_WALLET }],
    update: (cache, { data }) => {
      const balance = data?.cancelClassCredits?.walletBalanceInr;
      if (typeof balance !== 'number') {
        return;
      }
      cache.writeQuery({
        query: MY_WALLET,
        data: {
          myWallet: {
            __typename: 'UserWalletDto',
            balanceInr: balance,
          },
        },
      });
    },
  });
  const { data, loading, error } = useQuery(MY_CLASS_CREDITS, {
    fetchPolicy: 'network-only',
  });
  const credits = (data?.myClassCredits ?? []) as StudentClassCredit[];
  const unscheduled = credits.filter((row) => row.status === 'unscheduled');
  const unscheduledGroups = groupUnscheduledClassCredits(unscheduled);
  const scheduled = credits.filter((row) => row.status === 'scheduled');

  const openCancel = (credits: StudentClassCredit[]) => {
    setPending(credits);
    setCancelCount(credits.length);
    setCancelError(null);
  };
  const selected = pending?.slice(0, cancelCount) ?? [];
  const refundAmount = selected.reduce((sum, credit) => sum + (credit.refundableInr ?? 0), 0);

  const confirmCancel = (refundMethod: 'wallet' | 'gateway') => {
    if (selected.length === 0) {
      return;
    }
    setCancelError(null);
    void cancelCredits({
      variables: {
        creditIds: selected.map((credit) => String(credit.id)),
        refundMethod,
      },
    })
      .then(() => setPending(null))
      .catch((cancelFailure: unknown) => {
        setCancelError(
          cancelFailure instanceof Error
            ? cancelFailure.message
            : 'Could not cancel these classes.',
        );
      });
  };

  if (loading) {
    return <p className="text-sm text-muted">Loading classes…</p>;
  }
  if (error) {
    return <p className="text-sm text-danger">Could not load your classes.</p>;
  }

  return (
    <div className="w-full max-w-xl space-y-4">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Schedule classes</h1>
      {unscheduled.length === 0 && scheduled.length === 0 ? (
        <p className="text-sm text-slate-500">You have no purchased classes to schedule.</p>
      ) : null}
      {unscheduled.length > 0 ? (
        <section className="rounded-[20px] bg-white p-5">
          <h2 className="text-base font-extrabold text-[#143055]">
            {unscheduled.length} {unscheduled.length === 1 ? 'class' : 'classes'} to schedule
          </h2>
          <ul className="mt-3 space-y-3">
            {unscheduledGroups.map((group) => {
              const credit = group.credits[0];
              const count = group.credits.length;
              return (
                <li key={group.key} className="rounded-2xl bg-sky-50 px-4 py-3">
                  <p className="text-sm font-extrabold text-[#143055]">
                    {credit.offeringLabel}
                    {group.credits.some((row) => row.isDemo) ? (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
                        Free demo
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {credit.deliveryMode === 'online' ? 'Online' : 'Offline'} · {credit.tutorName}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#143055]">
                    {count} {count === 1 ? 'class' : 'classes'} to schedule
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSchedule(group.credits)}
                      className="rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white"
                    >
                      {count === 1 ? 'Pick a slot' : 'Pick slots'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openCancel(group.credits)}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[#b91c1c]"
                    >
                      {count === 1 ? 'Cancel' : 'Cancel classes'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {scheduled.length > 0 ? (
        <section className="rounded-[20px] bg-white p-5">
          <h2 className="text-base font-extrabold text-[#143055]">Scheduled</h2>
          <ul className="mt-3 space-y-3">
            {scheduled.map((credit) => (
              <li key={credit.id} className="rounded-2xl bg-sky-50 px-4 py-3">
                <p className="text-sm font-extrabold text-[#143055]">
                  {credit.offeringLabel}
                  {credit.isDemo ? (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
                      Free demo
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {credit.deliveryMode === 'online' ? 'Online' : 'Offline'} · {credit.tutorName}
                  {credit.startsAt
                    ? ` · ${formatIstBookingDateLabel(new Date(credit.startsAt))}`
                    : ''}
                </p>
                <div className="mt-2 flex gap-3">
                  {canChangeScheduledCredit(credit) ? (
                    <button
                      type="button"
                      onClick={() => onSchedule([credit])}
                      className="text-sm font-semibold text-[#2563eb]"
                    >
                      Reschedule
                    </button>
                  ) : null}
                  {canChangeScheduledCredit(credit) ? (
                    <button
                      type="button"
                      onClick={() => openCancel([credit])}
                      className="text-sm font-semibold text-[#b91c1c]"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {pending && selected.length > 0 ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            if (!cancelling) {
              setPending(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-classes-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="cancel-classes-title" className="text-lg font-extrabold text-[#143055]">
              Cancel classes
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {selected[0].offeringLabel} · {selected[0].tutorName}
            </p>
            {pending.length > 1 ? (
              <label className="mt-3 block text-sm text-[#143055]">
                Classes to cancel
                <input
                  type="number"
                  min={1}
                  max={pending.length}
                  value={cancelCount}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next)) {
                      return;
                    }
                    setCancelCount(Math.min(pending.length, Math.max(1, Math.floor(next))));
                  }}
                  className="mt-1 w-24 rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
            ) : null}
            <p className="mt-3 text-sm font-semibold text-[#143055]">
              Refund {formatInr(refundAmount)}
            </p>
            {cancelError ? <p className="mt-2 text-sm text-danger">{cancelError}</p> : null}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => confirmCancel('wallet')}
                className="rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {cancelling ? 'Cancelling…' : `Add ${formatInr(refundAmount)} to wallet`}
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => confirmCancel('gateway')}
                className="rounded-xl border border-[#2563eb] px-3 py-2 text-sm font-semibold text-[#2563eb] disabled:text-slate-300"
              >
                Refund {formatInr(refundAmount)} to your payment method
              </button>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="text-sm font-semibold text-slate-500"
              >
                Keep these classes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
