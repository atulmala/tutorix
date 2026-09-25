import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useQuery } from '@apollo/client';
import { MY_CLASS_CREDITS, STUDENT_BOOKED_CLASS_SESSIONS } from '@tutorix/shared-graphql/queries';
import type { StudentClassCredit } from '../student-cart/StudentClassCreditsScreen';
import { formatIstBookingTimeRange } from '@tutorix/shared-utils/student-booking';
import {
  istDayKey,
  istHomeScheduleDays,
  istHomeScheduleRange,
} from '@tutorix/shared-utils/student-schedule';

type StudentHomeScreenProps = {
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

export const StudentHomeScreen: React.FC<StudentHomeScreenProps> = ({
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>My schedule</Text>
        <View style={styles.weekChip}>
          <Text style={styles.weekChipText}>Next 2 weeks</Text>
        </View>
      </View>

      {unscheduledCount > 0 && onScheduleCredits ? (
        <Pressable
          style={styles.banner}
          onPress={onScheduleCredits}
          accessibilityRole="button"
          accessibilityLabel={`${unscheduledCount} ${unscheduledCount === 1 ? 'class' : 'classes'} to schedule`}
        >
          <Text style={styles.listEmptyTitle}>
            {unscheduledCount} {unscheduledCount === 1 ? 'class' : 'classes'} to schedule
          </Text>
          <Text style={styles.listEmptyCopy}>Pick 1-hour slots when you are ready.</Text>
        </Pressable>
      ) : null}

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
              {todayClasses.length} {todayClasses.length === 1 ? 'class' : 'classes'}
            </Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
            <ClockIcon />
          </View>
          <View style={styles.statCopy}>
            <Text style={styles.statLabel}>Learning hours</Text>
            <Text style={styles.statValue}>
              {selectedClasses.length} {selectedClasses.length === 1 ? 'hour' : 'hours'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.listCard}>
        {selectedClasses.length === 0 ? (
          <>
            <Text style={styles.listEmptyTitle}>No classes on this day</Text>
            <Text style={styles.listEmptyCopy}>
              Book a certified tutor and your upcoming sessions will appear here, with time,
              subject, and a join action when it is time to start.
            </Text>
            <Pressable
              style={styles.findButton}
              onPress={onOpenTutorSearch}
              accessibilityRole="button"
              accessibilityLabel="Find a tutor"
            >
              <Text style={styles.findButtonText}>Find a tutor</Text>
            </Pressable>
          </>
        ) : (
          selectedClasses.map((row) => (
            <View key={row.enrollmentId} style={styles.classRow}>
              <Text style={styles.classTime}>
                {formatIstBookingTimeRange(new Date(row.startsAt), row.durationMinutes)}
              </Text>
              <Text style={styles.classSubject}>{row.offeringLabel}</Text>
              <Text style={styles.listEmptyCopy}>
                {row.deliveryMode === 'online' ? 'Online' : 'Offline'} · {row.tutorName}
              </Text>
              {onRescheduleCredit
                ? (() => {
                    const credit = credits.find(
                      (item) => String(item.enrollmentId) === String(row.enrollmentId),
                    );
                    return credit ? (
                      <Pressable onPress={() => onRescheduleCredit(credit)}>
                        <Text style={styles.reschedule}>Reschedule</Text>
                      </Pressable>
                    ) : null;
                  })()
                : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.concludedCard}>
        <Text style={styles.concludedTitle}>Concluded classes</Text>
        <Text style={styles.listEmptyCopy}>
          Sessions you finish will be listed here so you can look back on them.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#e8f4ff' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 14 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#143055' },
  banner: {
    backgroundColor: '#fffbeb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reschedule: { marginTop: 6, color: '#2563eb', fontWeight: '700' },
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
  findButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  findButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  classRow: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  classTime: { fontSize: 14, fontWeight: '800', color: '#143055' },
  classSubject: { marginTop: 4, fontSize: 14, color: '#143055' },
  concludedCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  concludedTitle: { fontSize: 16, fontWeight: '800', color: '#143055' },
});
