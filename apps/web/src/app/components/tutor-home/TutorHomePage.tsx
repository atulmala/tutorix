import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  GET_MY_TUTOR_CALENDAR_UPDATED_TILL,
  GET_MY_TUTOR_DETAIL,
  TUTOR_BOOKED_CLASS_SESSIONS,
  TUTOR_CANCEL_SCHEDULED_CLASS,
  TUTOR_REQUEST_CLASS_RESCHEDULE,
} from '@tutorix/shared-graphql';
import {
  canChangeScheduledClass,
  formatIstBookingTimeRange,
  hasIncompleteRateCardOfferings,
  istBookedClassQueryRange,
  istDayKey,
  istHomeScheduleDays,
  needsCalendarUpdateThroughSunday,
  scheduledClassHasEnded,
  PENDING_CALENDAR_TASK_ACTION,
  PENDING_CALENDAR_TASK_MESSAGE,
  PENDING_RATE_CARD_TASK_ACTION,
  PENDING_RATE_CARD_TASK_MESSAGE,
  type RateCardOfferingLike,
} from '@tutorix/shared-utils';

type TutorHomePageProps = {
  onSetRateCard?: () => void;
  onUpdateCalendar?: () => void;
  onOpenConcludedClasses?: () => void;
  onOpenBookingHistory?: () => void;
};

type MyTutorDetailData = {
  myTutorDetail?: {
    offerings?: RateCardOfferingLike[] | null;
  } | null;
};

type CalendarUpdatedTillData = {
  myTutorCalendarUpdatedTill?: string | Date | null;
};

type TutorBookedClass = {
  enrollmentId: string;
  sessionId: string;
  startsAt: string;
  durationMinutes: number;
  deliveryMode: 'online' | 'offline';
  offeringLabel: string;
  studentName: string;
  isDemo: boolean;
};

type DaySession = {
  sessionId: string;
  startsAt: string;
  durationMinutes: number;
  deliveryMode: 'online' | 'offline';
  offeringLabel: string;
  isDemo: boolean;
  students: { enrollmentId: string; name: string }[];
};

function groupDaySessions(rows: TutorBookedClass[]): DaySession[] {
  const bySession = new Map<string, DaySession>();
  for (const row of rows) {
    const sessionId = String(row.sessionId);
    const student = { enrollmentId: String(row.enrollmentId), name: row.studentName };
    const existing = bySession.get(sessionId);
    if (!existing) {
      bySession.set(sessionId, {
        sessionId,
        startsAt: row.startsAt,
        durationMinutes: row.durationMinutes,
        deliveryMode: row.deliveryMode,
        offeringLabel: row.offeringLabel,
        isDemo: row.isDemo,
        students: [student],
      });
      continue;
    }
    if (!existing.students.some((item) => item.enrollmentId === student.enrollmentId)) {
      existing.students.push(student);
    }
  }
  return [...bySession.values()].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

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

function studentCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'student' : 'students'}`;
}

function StudentNamesPopup({
  anchor,
  students,
  onClose,
}: {
  anchor: { top: number; bottom: number; left: number };
  students: { enrollmentId: string; name: string }[];
  onClose: () => void;
}) {
  const popupWidth = 220;
  const left = Math.max(12, Math.min(anchor.left, window.innerWidth - popupWidth - 12));
  const belowTop = anchor.bottom + 8;
  const placeAbove = belowTop + 160 > window.innerHeight && anchor.top > 180;
  return (
    <>
      <button
        type="button"
        aria-label="Close student names"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <ul
        role="dialog"
        aria-label="Students"
        className="fixed z-50 w-[220px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
        style={
          placeAbove
            ? { left, bottom: window.innerHeight - anchor.top + 8 }
            : { left, top: belowTop }
        }
      >
        {students.map((student) => (
          <li key={student.enrollmentId} className="py-1 text-sm text-[#143055]">
            {student.name}
          </li>
        ))}
      </ul>
    </>
  );
}

function teachingHoursLabel(rows: TutorBookedClass[]): string {
  const seen = new Set<string>();
  let minutes = 0;
  for (const row of rows) {
    if (seen.has(String(row.sessionId))) {
      continue;
    }
    seen.add(String(row.sessionId));
    minutes += row.durationMinutes;
  }
  const hours = minutes / 60;
  const shown = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${shown} ${hours === 1 ? 'hour' : 'hours'}`;
}

export const TutorHomePage: React.FC<TutorHomePageProps> = ({
  onSetRateCard,
  onUpdateCalendar,
  onOpenConcludedClasses,
  onOpenBookingHistory,
}) => {
  const weekDays = useMemo(() => istHomeScheduleDays(), []);
  const scheduleRange = useMemo(() => istBookedClassQueryRange(), []);
  const todayKey = weekDays.find((d) => d.isToday)?.key ?? weekDays[0]?.key;
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const selected = weekDays.find((d) => d.key === selectedKey) ?? weekDays[0];

  const { data: detailData, loading: detailLoading } = useQuery<MyTutorDetailData>(
    GET_MY_TUTOR_DETAIL,
    { fetchPolicy: 'cache-and-network' },
  );
  const { data: tillData, loading: tillLoading } = useQuery<CalendarUpdatedTillData>(
    GET_MY_TUTOR_CALENDAR_UPDATED_TILL,
    { fetchPolicy: 'cache-and-network' },
  );
  const sessionVariables = {
    from: scheduleRange.from.toISOString(),
    to: scheduleRange.to.toISOString(),
  };
  const { data: sessionData } = useQuery(TUTOR_BOOKED_CLASS_SESSIONS, {
    variables: sessionVariables,
    fetchPolicy: 'network-only',
  });
  const [cancelClass, { loading: cancelling }] = useMutation(TUTOR_CANCEL_SCHEDULED_CLASS, {
    refetchQueries: [{ query: TUTOR_BOOKED_CLASS_SESSIONS, variables: sessionVariables }],
  });
  const [requestReschedule, { loading: rescheduling }] = useMutation(
    TUTOR_REQUEST_CLASS_RESCHEDULE,
    {
      refetchQueries: [{ query: TUTOR_BOOKED_CLASS_SESSIONS, variables: sessionVariables }],
    },
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingEnrollmentId, setPendingEnrollmentId] = useState<string | null>(null);
  const [openStudentsSessionId, setOpenStudentsSessionId] = useState<string | null>(null);
  const [studentPopupAnchor, setStudentPopupAnchor] = useState<{
    top: number;
    bottom: number;
    left: number;
  } | null>(null);
  const [activeClassIndex, setActiveClassIndex] = useState(0);
  const classScrollerRef = useRef<HTMLUListElement>(null);
  const booked = (sessionData?.tutorBookedClassSessions ?? []) as TutorBookedClass[];
  const dayClasses = booked.filter(
    (row) => istDayKey(new Date(row.startsAt)) === selected?.key,
  );
  const selectedClasses = dayClasses.filter(
    (row) => !scheduledClassHasEnded(row.startsAt, row.durationMinutes),
  );
  const daySessions = groupDaySessions(selectedClasses);
  const noUpcomingToday =
    Boolean(selected?.isToday) && daySessions.length === 0 && dayClasses.length > 0;
  const openSession =
    daySessions.find((session) => session.sessionId === openStudentsSessionId) ?? null;

  useEffect(() => {
    setActiveClassIndex(0);
    if (classScrollerRef.current) {
      classScrollerRef.current.scrollLeft = 0;
    }
  }, [selected?.key]);

  useEffect(() => {
    if (!openStudentsSessionId) {
      return;
    }
    const close = () => {
      setOpenStudentsSessionId(null);
      setStudentPopupAnchor(null);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [openStudentsSessionId]);
  const todayClasses = booked.filter((row) => istDayKey(new Date(row.startsAt)) === todayKey);
  const concludedClasses = booked
    .filter((row) => scheduledClassHasEnded(row.startsAt, row.durationMinutes))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const todaySessionCount = new Set(todayClasses.map((row) => String(row.sessionId))).size;
  const changing = cancelling || rescheduling;

  const runClassAction = async (
    enrollmentId: string,
    confirmText: string,
    action: (enrollmentId: string) => Promise<unknown>,
  ) => {
    if (!window.confirm(confirmText)) {
      return;
    }
    setActionError(null);
    setPendingEnrollmentId(enrollmentId);
    try {
      await action(enrollmentId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update this class.');
    } finally {
      setPendingEnrollmentId(null);
    }
  };

  const showRateCardTask =
    !detailLoading &&
    hasIncompleteRateCardOfferings(detailData?.myTutorDetail?.offerings);
  const showCalendarTask =
    !tillLoading &&
    needsCalendarUpdateThroughSunday(tillData?.myTutorCalendarUpdatedTill);
  const showPendingTasks = showRateCardTask || showCalendarTask;

  return (
    <div className="w-full max-w-xl space-y-4">
      {showPendingTasks ? (
        <section className="space-y-2.5">
          <h2 className="text-[15px] font-extrabold text-[#143055]">Pending tasks</h2>
          {showRateCardTask ? (
            <div className="rounded-[20px] border border-amber-200 bg-white p-5">
              <p className="text-sm leading-6 text-slate-600">
                {PENDING_RATE_CARD_TASK_MESSAGE}
              </p>
              {onSetRateCard ? (
                <button
                  type="button"
                  onClick={onSetRateCard}
                  className="mt-3 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {PENDING_RATE_CARD_TASK_ACTION}
                </button>
              ) : null}
            </div>
          ) : null}
          {showCalendarTask ? (
            <div className="rounded-[20px] border border-amber-200 bg-white p-5">
              <p className="text-sm leading-6 text-slate-600">
                {PENDING_CALENDAR_TASK_MESSAGE}
              </p>
              {onUpdateCalendar ? (
                <button
                  type="button"
                  onClick={onUpdateCalendar}
                  className="mt-3 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {PENDING_CALENDAR_TASK_ACTION}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-extrabold text-[#143055]">My schedule</h1>
        <span className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-sm font-semibold text-[#2563eb]">
          Next 2 weeks
        </span>
      </div>

      <div className="overflow-x-auto rounded-[18px] bg-white p-2">
        <div className="flex w-max gap-1">
          {weekDays.map((day) => {
            const on = day.key === selected?.key;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => {
                  setSelectedKey(day.key);
                  setOpenStudentsSessionId(null);
                  setStudentPopupAnchor(null);
                }}
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
              {todaySessionCount} {todaySessionCount === 1 ? 'class' : 'classes'}
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
            <p className="text-[11px] font-semibold text-slate-500">Teaching hours</p>
            <p className="text-[15px] font-extrabold text-[#143055]">
              {teachingHoursLabel(dayClasses)}
            </p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-base font-extrabold text-[#143055]">
          {classesHeading(selected, daySessions.length)}
        </h2>
        {daySessions.length === 0 ? (
          <div className="mt-3 rounded-[20px] bg-white p-5">
            <p className="text-base font-extrabold text-[#143055]">
              {noUpcomingToday ? 'No upcoming classes today' : 'No classes on this day'}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              When students book you, upcoming sessions will appear here, with time, subject,
              and a start action when it is time to begin.
            </p>
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
              {daySessions.map((session) => {
                const studentsOpen = openStudentsSessionId === session.sessionId;
                const canChange = canChangeScheduledClass(
                  session.startsAt,
                  session.deliveryMode,
                );
                const actionEnrollmentId = session.students[0]?.enrollmentId;
                const rescheduleConfirm =
                  session.students.length > 1
                    ? 'Ask every student in this class to pick a new time? This slot will be released.'
                    : 'Ask the student to pick a new time? This slot will be released.';
                const cancelConfirm =
                  session.students.length > 1
                    ? 'Cancel this class for every student? Each student will be refunded.'
                    : 'Cancel this class? The student will be refunded.';
                return (
                  <li
                    key={session.sessionId}
                    className="w-full shrink-0 grow-0 basis-full snap-start rounded-[20px] bg-white p-5"
                  >
                    <p className="text-sm font-extrabold text-[#143055]">
                      {formatIstBookingTimeRange(
                        new Date(session.startsAt),
                        session.durationMinutes,
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {session.deliveryMode === 'online' ? 'Online' : 'Offline'}
                    </p>
                    <p className="mt-1 text-sm text-[#143055]">
                      {session.offeringLabel}
                      {session.isDemo ? (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
                          Free demo
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-2">
                      <button
                        type="button"
                        aria-expanded={studentsOpen}
                        onClick={(event) => {
                          if (studentsOpen) {
                            setOpenStudentsSessionId(null);
                            setStudentPopupAnchor(null);
                            return;
                          }
                          const rect = event.currentTarget.getBoundingClientRect();
                          setStudentPopupAnchor({
                            top: rect.top,
                            bottom: rect.bottom,
                            left: rect.left,
                          });
                          setOpenStudentsSessionId(session.sessionId);
                        }}
                        className="text-sm font-semibold text-[#2563eb] underline decoration-[#2563eb]/40 underline-offset-2"
                      >
                        {studentCountLabel(session.students.length)}
                      </button>
                    </div>
                    {canChange && actionEnrollmentId ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={changing}
                          onClick={() =>
                            void runClassAction(
                              session.sessionId,
                              rescheduleConfirm,
                              () =>
                                requestReschedule({
                                  variables: { enrollmentId: actionEnrollmentId },
                                }),
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#143055] disabled:text-slate-400"
                        >
                          {pendingEnrollmentId === session.sessionId && rescheduling
                            ? 'Requesting…'
                            : 'Request reschedule'}
                        </button>
                        <button
                          type="button"
                          disabled={changing}
                          onClick={() =>
                            void runClassAction(
                              session.sessionId,
                              cancelConfirm,
                              () =>
                                cancelClass({
                                  variables: { enrollmentId: actionEnrollmentId },
                                }),
                            )
                          }
                          className="rounded-xl px-3 py-2 text-sm font-semibold text-[#b91c1c] disabled:text-slate-400"
                        >
                          {pendingEnrollmentId === session.sessionId && cancelling
                            ? 'Cancelling…'
                            : 'Cancel class'}
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
          </ul>
          {daySessions.length > 1 && activeClassIndex < daySessions.length - 1 ? (
            <span
              aria-hidden
              className="pointer-events-none absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl font-bold text-[#2563eb] shadow"
            >
              ›
            </span>
          ) : null}
          </div>
          {daySessions.length > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {daySessions.map((session, index) => (
                <button
                  key={session.sessionId}
                  type="button"
                  aria-label={`Class ${index + 1} of ${daySessions.length}`}
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
          </>
        )}
        {actionError ? (
          <p className="mt-3 text-sm font-semibold text-red-600">{actionError}</p>
        ) : null}
        {openSession && studentPopupAnchor
          ? createPortal(
              <StudentNamesPopup
                anchor={studentPopupAnchor}
                students={openSession.students}
                onClose={() => {
                  setOpenStudentsSessionId(null);
                  setStudentPopupAnchor(null);
                }}
              />,
              document.body,
            )
          : null}
      </section>

      <section className="rounded-[20px] bg-white p-5">
        <h2 className="text-base font-extrabold text-[#143055]">Booking history</h2>
        <button
          type="button"
          onClick={onOpenBookingHistory}
          aria-label="See booking history"
          className="mt-3 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
        >
          See details
        </button>
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
