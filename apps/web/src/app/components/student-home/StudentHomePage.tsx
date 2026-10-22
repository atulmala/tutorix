import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  MY_CLASS_CREDITS,
  STUDENT_BOOKED_CLASS_SESSIONS,
  STUDENT_CLASS_BOOKINGS,
  UNSCHEDULE_CLASS_CREDIT,
} from '@tutorix/shared-graphql';
import type { StudentClassCredit } from '../student-cart/StudentClassCreditsPage';
import {
  canChangeScheduledClass,
  canJoinOnlineClass,
  formatIstBookingTimeRange,
  istBookedClassQueryRange,
  istDayKey,
  istHomeScheduleDays,
  scheduledClassHasEnded,
  isClassCreditCancellable,
} from '@tutorix/shared-utils';
import { useStudentHasRebookTutors } from '../student-rebook/useStudentHasRebookTutors';

const HOME_BOOKING_HISTORY_INPUT = { page: 1, pageSize: 1 };

type StudentHomePageProps = {
  onOpenTutorSearch: () => void;
  onOpenRebook?: () => void;
  onScheduleCredits?: () => void;
  onRescheduleCredit?: (credit: StudentClassCredit) => void;
  onCancelScheduledClass?: (credit: StudentClassCredit) => void;
  onOpenConcludedClasses?: () => void;
  onOpenBookingHistory?: () => void;
  onJoinOnlineClass?: (sessionId: string) => void;
};

function weekdayTitle(abbr: string): string {
  return abbr.charAt(0) + abbr.slice(1).toLowerCase();
}

function ordinalDay(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${day}th`;
  }
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function classesHeading(
  day: { day: number; abbr: string; monthAbbr: string } | undefined,
  count: number,
): string {
  if (!day) {
    return `Classes: ${count}`;
  }
  return `Classes on ${weekdayTitle(day.abbr)}, ${ordinalDay(day.day)} ${day.monthAbbr}: ${count}`;
}

type BookedClass = {
  enrollmentId: string;
  sessionId?: string;
  startsAt: string;
  durationMinutes: number;
  deliveryMode: 'online' | 'offline';
  offeringLabel: string;
  tutorName: string;
};

function TutorActionButtons({
  onOpenTutorSearch,
  onOpenRebook,
  showRebook,
}: {
  onOpenTutorSearch: () => void;
  onOpenRebook?: () => void;
  showRebook: boolean;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2.5">
      <button
        type="button"
        onClick={onOpenTutorSearch}
        className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
      >
        Find a tutor
      </button>
      {showRebook && onOpenRebook ? (
        <button
          type="button"
          onClick={onOpenRebook}
          className="rounded-xl border border-[#2563eb] bg-white px-4 py-2.5 text-sm font-semibold text-[#2563eb] hover:bg-sky-50"
        >
          Re-book
        </button>
      ) : null}
    </div>
  );
}

export const StudentHomePage: React.FC<StudentHomePageProps> = ({
  onOpenTutorSearch,
  onOpenRebook,
  onScheduleCredits,
  onRescheduleCredit,
  onCancelScheduledClass,
  onOpenConcludedClasses,
  onOpenBookingHistory,
  onJoinOnlineClass,
}) => {
  const weekDays = useMemo(() => istHomeScheduleDays(), []);
  const scheduleRange = useMemo(() => istBookedClassQueryRange(), []);
  const todayKey = weekDays.find((d) => d.isToday)?.key ?? weekDays[0]?.key;
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [activeClassIndex, setActiveClassIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const classScrollerRef = useRef<HTMLUListElement>(null);
  const selected = weekDays.find((d) => d.key === selectedKey) ?? weekDays[0];
  const scheduleQueryVariables = useMemo(
    () => ({
      from: scheduleRange.from.toISOString(),
      to: scheduleRange.to.toISOString(),
    }),
    [scheduleRange.from, scheduleRange.to],
  );

  const [unscheduleClass] = useMutation(UNSCHEDULE_CLASS_CREDIT, {
    refetchQueries: [
      { query: STUDENT_BOOKED_CLASS_SESSIONS, variables: scheduleQueryVariables },
      { query: MY_CLASS_CREDITS },
      'StudentClassBookings',
    ],
  });

  const confirmUnschedule = (credit: StudentClassCredit) => {
    const ok = window.confirm(
      'Unschedule this class? This frees the tutor and your slot. The class moves back to unscheduled and you can pick a new time later.',
    );
    if (!ok) {
      return;
    }
    void unscheduleClass({ variables: { creditId: String(credit.id) } });
  };

  const { data } = useQuery(STUDENT_BOOKED_CLASS_SESSIONS, {
    variables: scheduleQueryVariables,
    fetchPolicy: 'network-only',
  });
  const showRebook = useStudentHasRebookTutors();
  const { data: creditData } = useQuery(MY_CLASS_CREDITS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: bookingHistoryData } = useQuery(STUDENT_CLASS_BOOKINGS, {
    variables: { input: HOME_BOOKING_HISTORY_INPUT },
    fetchPolicy: 'cache-and-network',
  });
  const totalBookings = bookingHistoryData?.studentClassBookings?.totalCount ?? 0;
  const booked = (data?.studentBookedClassSessions ?? []) as BookedClass[];
  const credits = (creditData?.myClassCredits ?? []) as StudentClassCredit[];
  const unscheduledCount = credits.filter((row) => row.status === 'unscheduled').length;
  const dayClasses = booked.filter(
    (row) => istDayKey(new Date(row.startsAt)) === selected?.key,
  );
  const selectedClasses = dayClasses
    .filter((row) => !scheduledClassHasEnded(row.startsAt, row.durationMinutes))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const noUpcomingToday =
    Boolean(selected?.isToday) && selectedClasses.length === 0 && dayClasses.length > 0;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setActiveClassIndex(0);
    if (classScrollerRef.current) {
      classScrollerRef.current.scrollLeft = 0;
    }
  }, [selected?.key]);
  const todayClasses = booked.filter((row) => istDayKey(new Date(row.startsAt)) === todayKey);
  const concludedClasses = booked
    .filter((row) => scheduledClassHasEnded(row.startsAt, row.durationMinutes))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const todayConcludedCount = concludedClasses.filter(
    (row) => istDayKey(new Date(row.startsAt)) === todayKey,
  ).length;

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
            <p className="text-[13px] font-extrabold leading-5 text-[#143055]">
              Today: {todayConcludedCount} {todayConcludedCount === 1 ? 'hour' : 'hours'}
            </p>
            <p className="text-[13px] font-extrabold leading-5 text-[#143055]">
              Till now: {concludedClasses.length}
            </p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-base font-extrabold text-[#143055]">
          {classesHeading(selected, selectedClasses.length)}
        </h2>
        {selectedClasses.length === 0 ? (
          <div className="mt-3 rounded-[20px] bg-white p-5">
            <p className="text-base font-extrabold text-[#143055]">
              {noUpcomingToday ? 'No upcoming classes today' : 'No classes on this day'}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Book a certified tutor and your upcoming sessions will appear here, with time,
              subject, and a join action when it is time to start.
            </p>
            <TutorActionButtons
              onOpenTutorSearch={onOpenTutorSearch}
              onOpenRebook={onOpenRebook}
              showRebook={showRebook}
            />
          </div>
        ) : (
          <>
            <div className="relative mt-3">
              <ul
                ref={classScrollerRef}
                className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
                onScroll={(event) => {
                  const el = event.currentTarget;
                  if (el.clientWidth <= 0) {
                    return;
                  }
                  setActiveClassIndex(Math.round(el.scrollLeft / el.clientWidth));
                }}
              >
                {selectedClasses.map((row) => {
                  const credit = credits.find(
                    (item) => String(item.enrollmentId) === String(row.enrollmentId),
                  );
                  const canChange = canChangeScheduledClass(row.startsAt, row.deliveryMode);
                  const canReschedule =
                    Boolean(onRescheduleCredit) && Boolean(credit) && canChange;
                  const canUnschedule = Boolean(credit) && canChange;
                  const canCancelClass =
                    Boolean(onCancelScheduledClass) &&
                    credit != null &&
                    isClassCreditCancellable(
                      {
                        id: credit.id,
                        status: credit.status,
                        isDemo: credit.isDemo,
                        startsAt: row.startsAt,
                        durationMinutes: row.durationMinutes,
                        deliveryMode: row.deliveryMode,
                      },
                      now,
                    );
                  const canJoin =
                    Boolean(onJoinOnlineClass) &&
                    Boolean(row.sessionId) &&
                    row.deliveryMode === 'online' &&
                    canJoinOnlineClass(row.startsAt, row.durationMinutes, now);
                  return (
                    <li
                      key={row.enrollmentId}
                      className="w-full shrink-0 grow-0 basis-full snap-start rounded-[20px] bg-white p-5"
                    >
                      <p className="text-sm font-extrabold text-[#143055]">
                        {formatIstBookingTimeRange(new Date(row.startsAt), row.durationMinutes)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {row.deliveryMode === 'online' ? 'Online' : 'Offline'}
                      </p>
                      <p className="mt-1 text-sm text-[#143055]">{row.offeringLabel}</p>
                      <p className="mt-1 text-sm text-[#143055]">{row.tutorName}</p>
                      {canJoin && row.sessionId && onJoinOnlineClass ? (
                        <button
                          type="button"
                          onClick={() => onJoinOnlineClass(String(row.sessionId))}
                          className="mt-3 rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white"
                        >
                          Join class
                        </button>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {canReschedule && credit && onRescheduleCredit ? (
                          <button
                            type="button"
                            onClick={() => onRescheduleCredit(credit)}
                            className="text-sm font-extrabold text-[#2563eb]"
                          >
                            Reschedule
                          </button>
                        ) : null}
                        {canUnschedule && credit ? (
                          <button
                            type="button"
                            onClick={() => confirmUnschedule(credit)}
                            className="text-sm font-extrabold text-red-600"
                          >
                            Unschedule
                          </button>
                        ) : null}
                        {canCancelClass && credit && onCancelScheduledClass ? (
                          <button
                            type="button"
                            onClick={() => onCancelScheduledClass(credit)}
                            className="text-sm font-extrabold text-red-700"
                          >
                            Cancel class
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {selectedClasses.length > 1 && activeClassIndex < selectedClasses.length - 1 ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl font-bold text-[#2563eb] shadow"
                >
                  ›
                </span>
              ) : null}
            </div>
            {selectedClasses.length > 1 ? (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {selectedClasses.map((row, index) => (
                  <button
                    key={row.enrollmentId}
                    type="button"
                    aria-label={`Class ${index + 1} of ${selectedClasses.length}`}
                    aria-current={index === activeClassIndex}
                    onClick={() => {
                      const el = classScrollerRef.current;
                      if (!el) {
                        return;
                      }
                      el.scrollLeft = index * el.clientWidth;
                      setActiveClassIndex(index);
                    }}
                    className={`h-2 rounded-full ${
                      index === activeClassIndex ? 'w-5 bg-[#2563eb]' : 'w-2 bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            ) : null}
            <TutorActionButtons
              onOpenTutorSearch={onOpenTutorSearch}
              onOpenRebook={onOpenRebook}
              showRebook={showRebook}
            />
          </>
        )}
      </section>

      <section className="rounded-[20px] bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-[#143055]">Booking history</h2>
            <button
              type="button"
              onClick={onOpenBookingHistory}
              aria-label="See booking history"
              className="mt-3 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
            >
              See details
            </button>
          </div>
          <div
            className="flex min-w-[96px] flex-col items-center justify-center rounded-[18px] border border-blue-200 bg-blue-50 px-3.5 py-3"
            aria-label={`${totalBookings} bookings so far`}
          >
            <span className="text-[40px] font-extrabold leading-none tabular-nums text-[#1d4ed8]">
              {totalBookings}
            </span>
            <span className="mt-0.5 text-center text-[11px] font-extrabold uppercase tracking-wide text-[#2563eb]">
              bookings
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[20px] bg-white p-5">
        <h2 className="text-base font-extrabold text-[#143055]">
          Concluded classes: {concludedClasses.length}
        </h2>
        <button
          type="button"
          onClick={onOpenConcludedClasses}
          className="mt-3 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
        >
          See details
        </button>
      </section>
    </div>
  );
};
