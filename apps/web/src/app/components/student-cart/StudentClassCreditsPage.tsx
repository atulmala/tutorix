import React from 'react';
import { useQuery } from '@apollo/client';
import { MY_CLASS_CREDITS } from '@tutorix/shared-graphql';
import { formatIstBookingDateLabel } from '@tutorix/shared-utils';

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
};

type StudentClassCreditsPageProps = {
  onSchedule: (credit: StudentClassCredit) => void;
};

export const StudentClassCreditsPage: React.FC<StudentClassCreditsPageProps> = ({
  onSchedule,
}) => {
  const { data, loading, error } = useQuery(MY_CLASS_CREDITS, {
    fetchPolicy: 'network-only',
  });
  const credits = (data?.myClassCredits ?? []) as StudentClassCredit[];
  const unscheduled = credits.filter((row) => row.status === 'unscheduled');
  const scheduled = credits.filter((row) => row.status === 'scheduled');

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
            {unscheduled.map((credit) => (
              <li key={credit.id} className="rounded-2xl bg-sky-50 px-4 py-3">
                <p className="text-sm font-extrabold text-[#143055]">{credit.offeringLabel}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {credit.deliveryMode === 'online' ? 'Online' : 'Offline'} · {credit.tutorName}
                </p>
                <button
                  type="button"
                  onClick={() => onSchedule(credit)}
                  className="mt-2 rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white"
                >
                  Pick a slot
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {scheduled.length > 0 ? (
        <section className="rounded-[20px] bg-white p-5">
          <h2 className="text-base font-extrabold text-[#143055]">Scheduled</h2>
          <ul className="mt-3 space-y-3">
            {scheduled.map((credit) => (
              <li key={credit.id} className="rounded-2xl bg-sky-50 px-4 py-3">
                <p className="text-sm font-extrabold text-[#143055]">{credit.offeringLabel}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {credit.deliveryMode === 'online' ? 'Online' : 'Offline'} · {credit.tutorName}
                  {credit.startsAt
                    ? ` · ${formatIstBookingDateLabel(new Date(credit.startsAt))}`
                    : ''}
                </p>
                <button
                  type="button"
                  onClick={() => onSchedule(credit)}
                  className="mt-2 text-sm font-semibold text-[#2563eb]"
                >
                  Reschedule
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};
