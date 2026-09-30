import React, { useMemo, useState } from 'react';
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
  const booked = (sessionData?.tutorBookedClassSessions ?? []) as TutorBookedClass[];
  const dayClasses = booked.filter(
    (row) => istDayKey(new Date(row.startsAt)) === selected?.key,
  );
  const selectedClasses = dayClasses.filter(
    (row) => !scheduledClassHasEnded(row.startsAt, row.durationMinutes),
  );
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

      <section className="rounded-[20px] bg-white p-5">
        {selectedClasses.length === 0 ? (
          <>
            <h2 className="text-base font-extrabold text-[#143055]">No classes on this day</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              When students book you, upcoming sessions will appear here, with time, subject,
              and a start action when it is time to begin.
            </p>
          </>
        ) : (
          <ul className="space-y-3">
            {selectedClasses.map((row) => (
              <li key={row.enrollmentId} className="rounded-2xl bg-sky-50 px-4 py-3">
                <p className="text-sm font-extrabold text-[#143055]">
                  {formatIstBookingTimeRange(new Date(row.startsAt), row.durationMinutes)}
                </p>
                <p className="mt-1 text-sm text-[#143055]">
                  {row.offeringLabel}
                  {row.isDemo ? (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
                      Free demo
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {row.deliveryMode === 'online' ? 'Online' : 'Offline'} · {row.studentName}
                </p>
                {canChangeScheduledClass(row.startsAt, row.deliveryMode) ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={changing}
                    onClick={() =>
                      void runClassAction(
                        String(row.enrollmentId),
                        'Ask the student to pick a new time? This slot will be released.',
                        (enrollmentId) =>
                          requestReschedule({ variables: { enrollmentId } }),
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#143055] disabled:text-slate-400"
                  >
                    {pendingEnrollmentId === String(row.enrollmentId) && rescheduling
                      ? 'Requesting…'
                      : 'Request reschedule'}
                  </button>
                  <button
                    type="button"
                    disabled={changing}
                    onClick={() =>
                      void runClassAction(
                        String(row.enrollmentId),
                        'Cancel this class? The student will be refunded.',
                        (enrollmentId) => cancelClass({ variables: { enrollmentId } }),
                      )
                    }
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-[#b91c1c] disabled:text-slate-400"
                  >
                    {pendingEnrollmentId === String(row.enrollmentId) && cancelling
                      ? 'Cancelling…'
                      : 'Cancel class'}
                  </button>
                </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {actionError ? (
          <p className="mt-3 text-sm font-semibold text-red-600">{actionError}</p>
        ) : null}
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
