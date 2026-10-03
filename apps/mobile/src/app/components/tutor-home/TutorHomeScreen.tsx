import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useMutation, useQuery } from '@apollo/client';
import {
  TUTOR_CANCEL_SCHEDULED_CLASS,
  TUTOR_REQUEST_CLASS_RESCHEDULE,
} from '@tutorix/shared-graphql/mutations';
import {
  GET_MY_TUTOR_CALENDAR_UPDATED_TILL,
  GET_MY_TUTOR_DETAIL,
  TUTOR_BOOKED_CLASS_SESSIONS,
} from '@tutorix/shared-graphql/queries';
import {
  canChangeScheduledClass,
  formatIstBookingTimeRange,
  scheduledClassHasEnded,
} from '@tutorix/shared-utils/student-booking';
import {
  istBookedClassQueryRange,
  istDayKey,
  istHomeScheduleDays,
} from '@tutorix/shared-utils/student-schedule';
import {
  hasIncompleteRateCardOfferings,
  PENDING_RATE_CARD_TASK_ACTION,
  PENDING_RATE_CARD_TASK_MESSAGE,
  type RateCardOfferingLike,
} from '@tutorix/shared-utils/rate-card';
import {
  needsCalendarUpdateThroughSunday,
  PENDING_CALENDAR_TASK_ACTION,
  PENDING_CALENDAR_TASK_MESSAGE,
} from '@tutorix/shared-utils/tutor-calendar';

type TutorHomeScreenProps = {
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

function CalendarIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 3v3M17 3v3M4.5 8h15M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z"
        stroke="#2563eb"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z"
        stroke="#10b981"
        strokeWidth={1.8}
      />
      <Path d="M12 8v4.5L15 15" stroke="#10b981" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export const TutorHomeScreen: React.FC<TutorHomeScreenProps> = ({
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
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [activeClassIndex, setActiveClassIndex] = useState(0);
  const classCarouselRef = useRef<ScrollView>(null);
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
    classCarouselRef.current?.scrollTo({ x: 0, animated: false });
  }, [selected?.key]);
  const todayClasses = booked.filter((row) => istDayKey(new Date(row.startsAt)) === todayKey);
  const concludedClasses = booked
    .filter((row) => scheduledClassHasEnded(row.startsAt, row.durationMinutes))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const todaySessionCount = new Set(todayClasses.map((row) => String(row.sessionId))).size;
  const changing = cancelling || rescheduling;

  const confirmClassAction = (
    enrollmentId: string,
    title: string,
    message: string,
    action: (enrollmentId: string) => Promise<unknown>,
  ) => {
    Alert.alert(title, message, [
      { text: 'Keep class', style: 'cancel' },
      {
        text: title,
        style: 'destructive',
        onPress: () => {
          setActionError(null);
          setPendingEnrollmentId(enrollmentId);
          void action(enrollmentId)
            .catch((err: unknown) => {
              setActionError(
                err instanceof Error ? err.message : 'Could not update this class.',
              );
            })
            .finally(() => setPendingEnrollmentId(null));
        },
      },
    ]);
  };

  const { data: detailData, loading: detailLoading } = useQuery<MyTutorDetailData>(
    GET_MY_TUTOR_DETAIL,
    { fetchPolicy: 'cache-and-network' },
  );
  const { data: tillData, loading: tillLoading } = useQuery<CalendarUpdatedTillData>(
    GET_MY_TUTOR_CALENDAR_UPDATED_TILL,
    { fetchPolicy: 'cache-and-network' },
  );

  const showRateCardTask =
    !detailLoading &&
    hasIncompleteRateCardOfferings(detailData?.myTutorDetail?.offerings);
  const showCalendarTask =
    !tillLoading &&
    needsCalendarUpdateThroughSunday(tillData?.myTutorCalendarUpdatedTill);
  const showPendingTasks = showRateCardTask || showCalendarTask;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {showPendingTasks ? (
        <View style={styles.pendingBlock}>
          <Text style={styles.pendingHeading}>Pending tasks</Text>
          {showRateCardTask ? (
            <View style={styles.pendingCard}>
              <Text style={styles.pendingCopy}>{PENDING_RATE_CARD_TASK_MESSAGE}</Text>
              {onSetRateCard ? (
                <Pressable
                  style={styles.pendingButton}
                  onPress={onSetRateCard}
                  accessibilityRole="button"
                  accessibilityLabel={PENDING_RATE_CARD_TASK_ACTION}
                >
                  <Text style={styles.pendingButtonText}>{PENDING_RATE_CARD_TASK_ACTION}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {showCalendarTask ? (
            <View style={styles.pendingCard}>
              <Text style={styles.pendingCopy}>{PENDING_CALENDAR_TASK_MESSAGE}</Text>
              {onUpdateCalendar ? (
                <Pressable
                  style={styles.pendingButton}
                  onPress={onUpdateCalendar}
                  accessibilityRole="button"
                  accessibilityLabel={PENDING_CALENDAR_TASK_ACTION}
                >
                  <Text style={styles.pendingButtonText}>{PENDING_CALENDAR_TASK_ACTION}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.titleRow}>
        <Text style={styles.title}>My schedule</Text>
        <View style={styles.weekChip}>
          <Text style={styles.weekChipText}>Next 2 weeks</Text>
        </View>
      </View>

      <View style={styles.weekStrip}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekStripInner}
        >
          {weekDays.map((day) => {
            const on = day.key === selected?.key;
            return (
              <Pressable
                key={day.key}
                style={[styles.dayCell, on && styles.dayCellOn]}
                onPress={() => {
                  setSelectedKey(day.key);
                  setOpenStudentsSessionId(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${day.abbr} ${day.day} ${day.monthAbbr}`}
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.dayAbbr, on && styles.dayTextOn]}>{day.abbr}</Text>
                <Text style={[styles.dayNum, on && styles.dayTextOn]}>
                  {day.day} {day.monthAbbr}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
            <CalendarIcon />
          </View>
          <View style={styles.statCopy}>
            <Text style={styles.statLabel}>Today's classes</Text>
            <Text style={styles.statValue}>
              {todaySessionCount} {todaySessionCount === 1 ? 'class' : 'classes'}
            </Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
            <ClockIcon />
          </View>
          <View style={styles.statCopy}>
            <Text style={styles.statLabel}>Teaching hours</Text>
            <Text style={styles.statValue}>{teachingHoursLabel(dayClasses)}</Text>
          </View>
        </View>
      </View>

      <View>
        <Text style={styles.classesHeading}>
          {classesHeading(selected, daySessions.length)}
        </Text>
        {daySessions.length === 0 ? (
          <View style={styles.listCard}>
            <Text style={styles.listEmptyTitle}>
              {noUpcomingToday ? 'No upcoming classes today' : 'No classes on this day'}
            </Text>
            <Text style={styles.listEmptyCopy}>
              When students book you, upcoming sessions will appear here, with time, subject,
              and a start action when it is time to begin.
            </Text>
          </View>
        ) : (
          <>
          <View
            style={styles.classCarousel}
            onLayout={(event) => setCarouselWidth(event.nativeEvent.layout.width)}
          >
            <ScrollView
              ref={classCarouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const width = event.nativeEvent.layoutMeasurement.width;
                if (width <= 0) {
                  return;
                }
                setActiveClassIndex(
                  Math.round(event.nativeEvent.contentOffset.x / width),
                );
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
                <View
                  key={session.sessionId}
                  style={[styles.classRow, carouselWidth > 0 ? { width: carouselWidth } : null]}
                >
                  <Text style={styles.classTime}>
                    {formatIstBookingTimeRange(
                      new Date(session.startsAt),
                      session.durationMinutes,
                    )}
                  </Text>
                  <Text style={styles.listEmptyCopy}>
                    {session.deliveryMode === 'online' ? 'Online' : 'Offline'}
                  </Text>
                  <Text style={styles.classSubject}>
                    {session.offeringLabel}
                    {session.isDemo ? ' · Free demo' : ''}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setOpenStudentsSessionId(studentsOpen ? null : session.sessionId)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={studentCountLabel(session.students.length)}
                    accessibilityState={{ expanded: studentsOpen }}
                  >
                    <Text style={styles.studentCount}>
                      {studentCountLabel(session.students.length)}
                    </Text>
                  </Pressable>
                  {canChange && actionEnrollmentId ? (
                    <View style={styles.classActions}>
                      <Pressable
                        disabled={changing}
                        onPress={() =>
                          confirmClassAction(
                            session.sessionId,
                            'Request reschedule',
                            rescheduleConfirm,
                            () =>
                              requestReschedule({
                                variables: { enrollmentId: actionEnrollmentId },
                              }),
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Request reschedule"
                      >
                        <Text style={styles.rescheduleAction}>
                          {pendingEnrollmentId === session.sessionId && rescheduling
                            ? 'Requesting…'
                            : 'Request reschedule'}
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={changing}
                        onPress={() =>
                          confirmClassAction(
                            session.sessionId,
                            'Cancel class',
                            cancelConfirm,
                            () =>
                              cancelClass({
                                variables: { enrollmentId: actionEnrollmentId },
                              }),
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Cancel class"
                      >
                        <Text style={styles.cancelAction}>
                          {pendingEnrollmentId === session.sessionId && cancelling
                            ? 'Cancelling…'
                            : 'Cancel class'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
            </ScrollView>
            {daySessions.length > 1 && activeClassIndex < daySessions.length - 1 ? (
              <View pointerEvents="none" style={styles.scrollHint}>
                <Text style={styles.scrollHintText}>›</Text>
              </View>
            ) : null}
          </View>
          {daySessions.length > 1 ? (
            <View
              style={styles.classDots}
              accessibilityLabel={`Class ${activeClassIndex + 1} of ${daySessions.length}`}
            >
              {daySessions.map((session, index) => (
                <View
                  key={session.sessionId}
                  style={[styles.classDot, index === activeClassIndex && styles.classDotOn]}
                />
              ))}
            </View>
          ) : null}
          </>
        )}
        {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
        <Modal
          visible={openSession != null}
          transparent
          animationType="fade"
          onRequestClose={() => setOpenStudentsSessionId(null)}
        >
          <Pressable
            style={styles.studentOverlay}
            onPress={() => setOpenStudentsSessionId(null)}
            accessibilityLabel="Close student names"
          >
            <Pressable style={styles.studentOverlayCard} onPress={() => undefined}>
              <Text style={styles.studentOverlayTitle}>Students</Text>
              {openSession?.students.map((student) => (
                <View key={student.enrollmentId} style={styles.studentOverlayRow}>
                  <Text style={styles.studentName}>{student.name}</Text>
                </View>
              ))}
            </Pressable>
          </Pressable>
        </Modal>
      </View>

      <View style={styles.concludedCard}>
        <Text style={styles.concludedTitle}>Booking history</Text>
        <Pressable
          style={styles.detailsButton}
          onPress={onOpenBookingHistory}
          accessibilityRole="button"
          accessibilityLabel="See booking history"
        >
          <Text style={styles.detailsButtonText}>See details</Text>
        </Pressable>
      </View>

      <View style={styles.concludedCard}>
        <Text style={styles.concludedTitle}>
          Concluded classes: {concludedClasses.length}
        </Text>
        <Pressable
          style={styles.detailsButton}
          onPress={onOpenConcludedClasses}
          accessibilityRole="button"
          accessibilityLabel="See details"
        >
          <Text style={styles.detailsButtonText}>See details</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#e8f4ff' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 14 },
  pendingBlock: { gap: 10 },
  pendingHeading: { fontSize: 15, fontWeight: '800', color: '#143055' },
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingCopy: { fontSize: 13, lineHeight: 20, color: '#475569' },
  pendingButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pendingButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#143055' },
  weekChip: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  weekChipText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  weekStrip: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 8,
  },
  weekStripInner: { flexDirection: 'row', gap: 4 },
  dayCell: {
    minWidth: 68,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
  },
  dayCellOn: { backgroundColor: '#2563eb' },
  dayAbbr: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.3 },
  dayNum: { marginTop: 4, fontSize: 13, fontWeight: '800', color: '#143055' },
  dayTextOn: { color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCopy: { flex: 1 },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  statValue: { marginTop: 2, fontSize: 15, fontWeight: '800', color: '#143055' },
  classesHeading: { fontSize: 16, fontWeight: '800', color: '#143055' },
  classCarousel: { marginTop: 12, position: 'relative' },
  scrollHint: {
    position: 'absolute',
    right: 8,
    top: '42%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollHintText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: -2,
  },
  classDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  classDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  classDotOn: {
    width: 18,
    backgroundColor: '#2563eb',
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginTop: 12,
  },
  listEmptyTitle: { fontSize: 16, fontWeight: '800', color: '#143055' },
  listEmptyCopy: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#64748b' },
  classRow: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  studentCount: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  studentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  studentOverlayCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  studentOverlayTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#143055',
    marginBottom: 8,
  },
  studentOverlayRow: { marginTop: 6 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#143055' },
  classTime: { fontSize: 14, fontWeight: '800', color: '#143055' },
  classSubject: { marginTop: 4, fontSize: 14, color: '#143055' },
  classActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  rescheduleAction: { color: '#143055', fontWeight: '700' },
  cancelAction: { color: '#b91c1c', fontWeight: '700' },
  actionError: { marginTop: 8, color: '#dc2626', fontWeight: '700' },
  concludedCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  concludedTitle: { fontSize: 16, fontWeight: '800', color: '#143055' },
  detailsButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  detailsButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
