import React, { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { MY_CLASS_CREDITS, STUDENT_BOOKED_CLASS_SESSIONS } from '@tutorix/shared-graphql';
import type { StudentClassCredit } from '../student-cart/StudentClassCreditsPage';
import {
  formatIstBookingTimeRange,
  istDayKey,
  istHomeScheduleDays,
  istHomeScheduleRange,
} from '@tutorix/shared-utils';

type StudentHomePageProps = {
  onOpenTutorSearch: () => void;
  onScheduleCredits?: () => void;
  onRescheduleCredit?: (credit: StudentClassCredit) => void;
};

type BookedClass = {
  enrollmentId: string;
  startsAt: string;
  durationMinutes: number;
  deliveryMode: 'online' | 'offline';
  offeringLabel: string;
  tutorName: string;
};

export const StudentHomePage: React.FC<StudentHomePageProps> = ({
  onOpenTutorSearch,
  onScheduleCredits,
  onRescheduleCredit,
}) => {
  const weekDays = useMemo(() => istHomeScheduleDays(), []);
  const scheduleRange = useMemo(() => istHomeScheduleRange(), []);
  const todayKey = weekDays.find((d) => d.isToday)?.key ?? weekDays[0]?.key;
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const selected = weekDays.find((d) => d.key === selectedKey) ?? weekDays[0];

  const { data } = useQuery(STUDENT_BOOKED_CLASS_SESSIONS, {
    variables: {
      from: scheduleRange.from.toISOString(),
      to: scheduleRange.to.toISOString(),
    },
    fetchPolicy: 'network-only',
  });
  const { data: creditData } = useQuery(MY_CLASS_CREDITS, {
    fetchPolicy: 'cache-and-network',
  });
  const booked = (data?.studentBookedClassSessions ?? []) as BookedClass[];
  const credits = (creditData?.myClassCredits ?? []) as StudentClassCredit[];
  const unscheduledCount = credits.filter((row) => row.status === 'unscheduled').length;
  const selectedClasses = booked.filter(
    (row) => istDayKey(new Date(row.startsAt)) === selected?.key,
  );
  const todayClasses = booked.filter((row) => istDayKey(new Date(row.startsAt)) === todayKey);

  return (
    <div className="w-full max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-extrabold text-[#143055]">My schedule</h1>
        <span className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-sm font-semibold text-[#2563eb]">
          Next 2 weeks
        </span>
      </div>

      {unscheduledCount > 0 && onScheduleCredits ? (
        <button
          type="button"
          onClick={onScheduleCredits}
          className="w-full rounded-[20px] bg-amber-50 px-4 py-3 text-left"
        >
          <p className="text-sm font-extrabold text-[#143055]">
            {unscheduledCount} {unscheduledCount === 1 ? 'class' : 'classes'} to schedule
          </p>
          <p className="mt-0.5 text-sm text-slate-500">Pick 1-hour slots when you are ready.</p>
        </button>
      ) : null}

      <div className="overflow-x-auto rounded-[18px] bg-white p-2">
        <div className="flex w-max gap-1">
          {weekDays.map((day) => {
            const on = day.key === selected?.key;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedKey(day.key)}
                aria-label={`${day.abbr} ${day.day} ${day.monthAbbr}`}
                aria-pressed={on}
                className={`flex min-w-[4.25rem] flex-col items-center rounded-xl px-2 py-2 ${
                  on ? 'bg-[#2563eb] text-white' : 'text-[#143055]'
                }`}
              >
                <span
                  className={`text-[10px] font-bold tracking-wide ${
                    on ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {day.abbr}
                </span>
                <span className="mt-1 text-sm font-extrabold">
                  {day.day} {day.monthAbbr}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex items-center gap-2.5 rounded-2xl bg-white p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-[#2563eb]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 3v3M17 3v3M4.5 8h15M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Today's classes</p>
            <p className="text-[15px] font-extrabold text-[#143055]">
              {todayClasses.length} {todayClasses.length === 1 ? 'class' : 'classes'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl bg-white p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 8v4.5L15 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Learning hours</p>
            <p className="text-[15px] font-extrabold text-[#143055]">
              {selectedClasses.length} {selectedClasses.length === 1 ? 'hour' : 'hours'}
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-[20px] bg-white p-5">
        {selectedClasses.length === 0 ? (
          <>
            <h2 className="text-base font-extrabold text-[#143055]">No classes on this day</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Book a certified tutor and your upcoming sessions will appear here, with time,
              subject, and a join action when it is time to start.
            </p>
            <button
              type="button"
              onClick={onOpenTutorSearch}
              className="mt-4 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
            >
              Find a tutor
            </button>
          </>
        ) : (
          <ul className="space-y-3">
            {selectedClasses.map((row) => (
              <li key={row.enrollmentId} className="rounded-2xl bg-sky-50 px-4 py-3">
                <p className="text-sm font-extrabold text-[#143055]">
                  {formatIstBookingTimeRange(new Date(row.startsAt), row.durationMinutes)}
                </p>
                <p className="mt-1 text-sm text-[#143055]">{row.offeringLabel}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {row.deliveryMode === 'online' ? 'Online' : 'Offline'} · {row.tutorName}
                </p>
                {onRescheduleCredit
                  ? (() => {
                      const credit = credits.find(
                        (item) => String(item.enrollmentId) === String(row.enrollmentId),
                      );
                      return credit ? (
                        <button
                          type="button"
                          onClick={() => onRescheduleCredit(credit)}
                          className="mt-2 text-sm font-semibold text-[#2563eb]"
                        >
                          Reschedule
                        </button>
                      ) : null;
                    })()
                  : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[20px] bg-white p-5">
        <h2 className="text-base font-extrabold text-[#143055]">Concluded classes</h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          Sessions you finish will be listed here so you can look back on them.
        </p>
      </section>
    </div>
  );
};
