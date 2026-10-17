import React from 'react';
import { useQuery } from '@apollo/client';
import { MY_CLASS_CREDITS } from '@tutorix/shared-graphql';
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

type StudentClassCreditsPageProps = {
  onSchedule: (credits: StudentClassCredit[]) => void;
  onScheduleLater: () => void;
};

export const StudentClassCreditsPage: React.FC<StudentClassCreditsPageProps> = ({
  onSchedule,
  onScheduleLater,
}) => {
  const { data, loading, error } = useQuery(MY_CLASS_CREDITS, {
    fetchPolicy: 'network-only',
  });
  const credits = (data?.myClassCredits ?? []) as StudentClassCredit[];
  const unscheduled = credits.filter((row) => row.status === 'unscheduled');
  const unscheduledGroups = groupUnscheduledClassCredits(unscheduled);
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
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <button
        type="button"
        onClick={onScheduleLater}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-[#143055]"
      >
        I will schedule later
      </button>
    </div>
  );
};
