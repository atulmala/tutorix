import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { STUDENT_BOOKED_CLASS_SESSIONS } from '@tutorix/shared-graphql';
import {
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
  istBookedClassQueryRange,
  scheduledClassHasEnded,
} from '@tutorix/shared-utils';

type BookedClass = {
  enrollmentId: string;
  startsAt: string;
  durationMinutes: number;
  offeringLabel: string;
  tutorName: string;
};

export const StudentConcludedClassesPage: React.FC = () => {
  const scheduleRange = useMemo(() => istBookedClassQueryRange(), []);
  const { data, loading } = useQuery(STUDENT_BOOKED_CLASS_SESSIONS, {
    variables: {
      from: scheduleRange.from.toISOString(),
      to: scheduleRange.to.toISOString(),
    },
    fetchPolicy: 'network-only',
  });
  const rows = ((data?.studentBookedClassSessions ?? []) as BookedClass[])
    .filter((row) => scheduledClassHasEnded(row.startsAt, row.durationMinutes))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  return (
    <div className="w-full max-w-xl">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Concluded classes</h1>
      {loading && rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Loading classes…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-slate-500">No concluded classes yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.enrollmentId} className="rounded-2xl bg-white px-4 py-3">
              <p className="text-sm font-extrabold text-[#143055]">
                {formatIstBookingDateLabel(new Date(row.startsAt))}
              </p>
              <p className="mt-0.5 text-sm text-[#143055]">
                {formatIstBookingTimeRange(new Date(row.startsAt), row.durationMinutes)}
              </p>
              <p className="mt-1 text-sm text-[#143055]">{row.offeringLabel}</p>
              <p className="mt-0.5 text-sm text-slate-500">Tutor · {row.tutorName}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
