import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { MY_CLASS_CREDITS, UNSCHEDULE_CLASS_CREDIT } from '@tutorix/shared-graphql';
import {
  canChangeScheduledClass,
  formatIstScheduledClassDateTime,
  scheduledClassHasEnded,
  tutorBookingModeLabel,
} from '@tutorix/shared-utils';
import type { StudentClassCredit } from '../student-cart/StudentClassCreditsPage';

export type BookingScheduledClassesContext = {
  orderItemId: number;
  tutorName: string;
  offeringLabel: string;
};

type StudentBookingScheduledClassesPageProps = {
  booking: BookingScheduledClassesContext;
  onReschedule: (credit: StudentClassCredit) => void;
};

const DEFAULT_DURATION_MINUTES = 60;

export const StudentBookingScheduledClassesPage: React.FC<
  StudentBookingScheduledClassesPageProps
> = ({ booking, onReschedule }) => {
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyCreditId, setBusyCreditId] = useState<number | null>(null);

  const { data, loading, error, refetch } = useQuery(MY_CLASS_CREDITS, {
    fetchPolicy: 'network-only',
  });

  const [unscheduleClass] = useMutation(UNSCHEDULE_CLASS_CREDIT, {
    refetchQueries: ['StudentClassBookings', { query: MY_CLASS_CREDITS }],
  });

  const upcoming = useMemo(() => {
    const credits = (data?.myClassCredits ?? []) as StudentClassCredit[];
    return credits
      .filter(
        (row) =>
          row.orderItemId === booking.orderItemId &&
          row.status === 'scheduled' &&
          row.startsAt != null &&
          !scheduledClassHasEnded(row.startsAt, DEFAULT_DURATION_MINUTES),
      )
      .sort(
        (a, b) =>
          new Date(a.startsAt as string).getTime() - new Date(b.startsAt as string).getTime(),
      );
  }, [booking.orderItemId, data?.myClassCredits]);

  const confirmUnschedule = (credit: StudentClassCredit) => {
    const ok = window.confirm(
      'Unschedule this class? This frees the tutor and your slot. The class moves back to unscheduled and you can pick a new time later.',
    );
    if (!ok) {
      return;
    }
    setActionError(null);
    setBusyCreditId(credit.id);
    void unscheduleClass({ variables: { creditId: String(credit.id) } })
      .then(() => refetch())
      .catch((failure: unknown) => {
        setActionError(
          failure instanceof Error ? failure.message : 'Could not unschedule this class.',
        );
      })
      .finally(() => setBusyCreditId(null));
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading scheduled classes…</p>;
  }
  if (error) {
    return <p className="text-sm font-semibold text-red-600">Could not load scheduled classes.</p>;
  }

  return (
    <div className="w-full max-w-xl space-y-4">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Scheduled classes</h1>
      <p className="text-sm font-semibold text-slate-600">
        {booking.offeringLabel} · {booking.tutorName}
      </p>
      {actionError ? (
        <p className="text-sm font-semibold text-red-600" role="alert">{actionError}</p>
      ) : null}

      {upcoming.length === 0 ? (
        <p className="text-sm text-slate-500">No upcoming scheduled classes on this booking.</p>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((credit) => {
            const startsAt = new Date(credit.startsAt as string);
            const canChange = canChangeScheduledClass(credit.startsAt, credit.deliveryMode);
            const busy = busyCreditId === credit.id;
            return (
              <li
                key={credit.id}
                className="rounded-2xl border-l-4 border-l-[#2563eb] bg-white p-4 shadow-sm"
              >
                <p className="text-base font-extrabold text-[#143055]">
                  {formatIstScheduledClassDateTime(startsAt, DEFAULT_DURATION_MINUTES)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {tutorBookingModeLabel(credit.deliveryMode)}
                </p>
                {canChange ? (
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      disabled={busy}
                      className="text-sm font-extrabold text-[#2563eb] disabled:opacity-50"
                      onClick={() => onReschedule(credit)}
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="text-sm font-extrabold text-red-600 disabled:opacity-50"
                      onClick={() => confirmUnschedule(credit)}
                    >
                      {busy ? 'Unscheduling…' : 'Unschedule'}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs italic text-slate-400">
                    Changes are no longer available
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
