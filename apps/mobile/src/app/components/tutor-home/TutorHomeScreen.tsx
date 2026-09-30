import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
                onPress={() => setSelectedKey(day.key)}
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

      <View style={styles.listCard}>
        {selectedClasses.length === 0 ? (
          <>
            <Text style={styles.listEmptyTitle}>No classes on this day</Text>
            <Text style={styles.listEmptyCopy}>
              When students book you, upcoming sessions will appear here, with time, subject,
              and a start action when it is time to begin.
            </Text>
          </>
        ) : (
          selectedClasses.map((row) => (
            <View key={row.enrollmentId} style={styles.classRow}>
              <Text style={styles.classTime}>
                {formatIstBookingTimeRange(new Date(row.startsAt), row.durationMinutes)}
              </Text>
              <Text style={styles.classSubject}>
                {row.offeringLabel}
                {row.isDemo ? ' · Free demo' : ''}
              </Text>
              <Text style={styles.listEmptyCopy}>
                {row.deliveryMode === 'online' ? 'Online' : 'Offline'} · {row.studentName}
              </Text>
              {canChangeScheduledClass(row.startsAt, row.deliveryMode) ? (
              <View style={styles.classActions}>
                <Pressable
                  disabled={changing}
                  onPress={() =>
                    confirmClassAction(
                      String(row.enrollmentId),
                      'Request reschedule',
                      'Ask the student to pick a new time? This slot will be released.',
                      (enrollmentId) => requestReschedule({ variables: { enrollmentId } }),
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Request reschedule"
                >
                  <Text style={styles.rescheduleAction}>
                    {pendingEnrollmentId === String(row.enrollmentId) && rescheduling
                      ? 'Requesting…'
                      : 'Request reschedule'}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={changing}
                  onPress={() =>
                    confirmClassAction(
                      String(row.enrollmentId),
                      'Cancel class',
                      'Cancel this class? The student will be refunded.',
                      (enrollmentId) => cancelClass({ variables: { enrollmentId } }),
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Cancel class"
                >
                  <Text style={styles.cancelAction}>
                    {pendingEnrollmentId === String(row.enrollmentId) && cancelling
                      ? 'Cancelling…'
                      : 'Cancel class'}
                  </Text>
                </Pressable>
              </View>
              ) : null}
            </View>
          ))
        )}
        {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
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
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  listEmptyTitle: { fontSize: 16, fontWeight: '800', color: '#143055' },
  listEmptyCopy: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#64748b' },
  classRow: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
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
