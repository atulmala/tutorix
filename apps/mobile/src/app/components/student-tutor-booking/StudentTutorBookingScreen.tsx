import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import {
  TUTOR_BOOKABLE_SLOTS,
  TUTOR_SEARCH_DETAIL,
} from '@tutorix/shared-graphql/queries';
import {
  bookingCalendarFromDraft,
  bookingDaysWithSlots,
  bookingHorizonRange,
  formatIstBookingChipLabel,
  lockedDeliveryMode,
  weekOffsetsWithSlots,
  type StudentBookingDeliveryMode,
  type StudentBookingDraft,
} from '@tutorix/shared-utils/student-booking';
import { SLOT_DURATION_MINUTES } from '@tutorix/shared-utils/tutor-calendar';
import { istDayKey } from '@tutorix/shared-utils/student-schedule';

type StudentTutorBookingScreenProps = {
  tutorId: string;
  offeringId: string;
  draft?: StudentBookingDraft | null;
  lockedDeliveryMode?: StudentBookingDeliveryMode | null;
  title?: string;
  submitLabel?: string;
  onContinue: (draft: Required<StudentBookingDraft>) => void;
};

type BookableSlot = {
  tutorCalendarId: string;
  startsAt: string;
};

export const StudentTutorBookingScreen: React.FC<StudentTutorBookingScreenProps> = ({
  tutorId,
  offeringId,
  draft,
  lockedDeliveryMode: lockedFromCredit,
  title = 'Book a class',
  submitLabel = 'Continue',
  onContinue,
}) => {
  const restored = useMemo(() => bookingCalendarFromDraft(draft), [draft]);
  const [weekOffset, setWeekOffset] = useState(restored.weekOffset);
  const [selectedKey, setSelectedKey] = useState<string | null>(restored.selectedKey);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(restored.selectedSlotId);
  const [deliveryMode, setDeliveryMode] = useState<StudentBookingDeliveryMode | null>(
    lockedFromCredit ?? restored.deliveryMode,
  );

  const { data: detailData, loading: detailLoading, error: detailError } = useQuery(
    TUTOR_SEARCH_DETAIL,
    {
      variables: { tutorId, offeringId },
      fetchPolicy: 'network-only',
    },
  );
  const detail = detailData?.tutorSearchDetail;
  const offering = detail?.matchingOffering;
  const lockedMode = offering
    ? lockedDeliveryMode(
        offering.offlineEnabled === true,
        offering.onlineEnabled === true,
      )
    : null;

  useEffect(() => {
    if (lockedFromCredit) {
      setDeliveryMode(lockedFromCredit);
      return;
    }
    if (lockedMode) {
      setDeliveryMode(lockedMode);
    }
  }, [lockedFromCredit, lockedMode]);

  const horizon = useMemo(() => bookingHorizonRange(), []);
  const rangeVars = {
    tutorId,
    offeringId,
    from: horizon.from.toISOString(),
    to: horizon.to.toISOString(),
  };
  const { data: offlineData, loading: offlineLoading } = useQuery(TUTOR_BOOKABLE_SLOTS, {
    variables: { ...rangeVars, deliveryMode: 'offline' },
    skip: offering?.offlineEnabled !== true,
    fetchPolicy: 'network-only',
  });
  const { data: onlineData, loading: onlineLoading } = useQuery(TUTOR_BOOKABLE_SLOTS, {
    variables: { ...rangeVars, deliveryMode: 'online' },
    skip: offering?.onlineEnabled !== true,
    fetchPolicy: 'network-only',
  });
  const offlineSlots = (offlineData?.tutorBookableSlots ?? []) as BookableSlot[];
  const onlineSlots = (onlineData?.tutorBookableSlots ?? []) as BookableSlot[];
  const slots =
    deliveryMode === 'online'
      ? onlineSlots
      : deliveryMode === 'offline'
        ? offlineSlots
        : [];
  const dateStarts = useMemo(
    () =>
      deliveryMode
        ? slots.map((slot) => slot.startsAt)
        : [...offlineSlots, ...onlineSlots].map((slot) => slot.startsAt),
    [deliveryMode, slots, offlineSlots, onlineSlots],
  );
  const availableOffsets = useMemo(() => weekOffsetsWithSlots(dateStarts), [dateStarts]);
  const weekDays = useMemo(
    () => bookingDaysWithSlots(dateStarts, weekOffset),
    [dateStarts, weekOffset],
  );
  const slotsLoading =
    deliveryMode === 'online'
      ? onlineLoading
      : deliveryMode === 'offline'
        ? offlineLoading
        : offlineLoading || onlineLoading;
  const datesLocked = !deliveryMode;

  useEffect(() => {
    if (availableOffsets.length === 0 || availableOffsets.includes(weekOffset)) {
      return;
    }
    setWeekOffset(availableOffsets[0]);
  }, [availableOffsets, weekOffset]);

  const defaultKey = weekDays.find((d) => d.isToday)?.key ?? weekDays[0]?.key ?? null;
  const activeKey = datesLocked
    ? null
    : selectedKey && weekDays.some((d) => d.key === selectedKey)
      ? selectedKey
      : defaultKey;
  const daySlots = slots.filter(
    (slot) => activeKey != null && istDayKey(new Date(slot.startsAt)) === activeKey,
  );
  const selectedSlot = daySlots.find((slot) => slot.tutorCalendarId === selectedSlotId);
  const prevOffset = [...availableOffsets].reverse().find((offset) => offset < weekOffset);
  const nextOffset = availableOffsets.find((offset) => offset > weekOffset);

  if (detailLoading) {
    return <Text style={styles.hint}>Loading calendar…</Text>;
  }
  if (detailError || !detail || !offering) {
    return <Text style={styles.hint}>Could not load this tutor’s calendar.</Text>;
  }

  const bothModes =
    offering.offlineEnabled && offering.onlineEnabled && !lockedFromCredit;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>
        {detail.displayName} · {offering.offeringLabel} · {SLOT_DURATION_MINUTES} min
      </Text>

      {bothModes ? (
        <View style={styles.modeRow}>
          {(['offline', 'online'] as const).map((mode) => {
            const on = deliveryMode === mode;
            return (
              <Pressable
                key={mode}
                style={[styles.modeChip, on && styles.modeChipOn]}
                onPress={() => {
                  setDeliveryMode(mode);
                  setSelectedSlotId(null);
                  setSelectedKey(null);
                }}
              >
                <Text style={[styles.modeText, on && styles.modeTextOn]}>
                  {mode === 'offline' ? 'Offline' : 'Online'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.section}>
          {deliveryMode === 'online' ? 'Online' : 'Offline'}
        </Text>
      )}

      {availableOffsets.length > 1 ? (
        <View style={styles.weekNav}>
          <Pressable
            onPress={() => {
              if (prevOffset == null) {
                return;
              }
              setWeekOffset(prevOffset);
              setSelectedKey(null);
              setSelectedSlotId(null);
            }}
            disabled={prevOffset == null}
          >
            <Text style={[styles.weekNavText, prevOffset == null && styles.disabled]}>
              Previous week
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (nextOffset == null) {
                return;
              }
              setWeekOffset(nextOffset);
              setSelectedKey(null);
              setSelectedSlotId(null);
            }}
            disabled={nextOffset == null}
          >
            <Text style={[styles.weekNavText, nextOffset == null && styles.disabled]}>
              Next week
            </Text>
          </Pressable>
        </View>
      ) : null}

      {weekDays.length > 0 ? (
        <View style={styles.weekStrip}>
          {weekDays.map((day) => {
            const on = !datesLocked && day.key === activeKey;
            return (
              <Pressable
                key={day.key}
                style={[styles.dayCell, datesLocked && styles.dayCellLocked, on && styles.dayCellOn]}
                onPress={() => {
                  if (datesLocked) {
                    return;
                  }
                  setSelectedKey(day.key);
                  setSelectedSlotId(null);
                }}
                disabled={datesLocked}
                accessibilityRole="button"
                accessibilityLabel={`${day.abbr} ${day.day} ${day.monthAbbr}`}
                accessibilityState={{ selected: on, disabled: datesLocked }}
              >
                <Text style={[styles.dayAbbr, datesLocked && styles.dayTextLocked, on && styles.dayTextOn]}>
                  {day.abbr}
                </Text>
                <Text style={[styles.dayNum, datesLocked && styles.dayTextLocked, on && styles.dayTextOn]}>
                  {day.day} {day.monthAbbr}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.card}>
        {!deliveryMode ? (
          <Text style={styles.meta}>Choose Online or Offline to see 1-hour slots.</Text>
        ) : slotsLoading ? (
          <Text style={styles.meta}>Loading 1-hour slots…</Text>
        ) : slots.length === 0 ? (
          <Text style={styles.meta}>No open 1-hour slots.</Text>
        ) : daySlots.length === 0 ? (
          <Text style={styles.meta}>No open 1-hour slots on this day.</Text>
        ) : (
          <View style={styles.chips}>
            {daySlots.map((slot) => {
              const on = slot.tutorCalendarId === selectedSlotId;
              return (
                <Pressable
                  key={slot.tutorCalendarId}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => setSelectedSlotId(slot.tutorCalendarId)}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {formatIstBookingChipLabel(new Date(slot.startsAt))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <Pressable
        style={[styles.continue, (!selectedSlot || !deliveryMode) && styles.continueOff]}
        disabled={!selectedSlot || !deliveryMode}
        onPress={() => {
          if (!selectedSlot || !deliveryMode) {
            return;
          }
          onContinue({
            tutorId,
            offeringId,
            tutorCalendarId: selectedSlot.tutorCalendarId,
            deliveryMode,
            startsAt: selectedSlot.startsAt,
          });
        }}
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
      >
        <Text style={styles.continueText}>{submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#e8f4ff' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#143055' },
  meta: { color: '#6b7280', fontSize: 14 },
  section: { fontSize: 16, fontWeight: '700', color: '#143055' },
  hint: { padding: 24, color: '#6b7280', textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeChipOn: { backgroundColor: '#2563eb' },
  modeText: { fontWeight: '700', color: '#143055' },
  modeTextOn: { color: '#fff' },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between' },
  weekNavText: { fontWeight: '700', color: '#2563eb' },
  disabled: { color: '#cbd5e1' },
  weekStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 8,
    gap: 4,
  },
  dayCell: {
    minWidth: 56,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
  },
  dayCellLocked: { opacity: 0.45 },
  dayCellOn: { backgroundColor: '#2563eb' },
  dayAbbr: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  dayNum: { marginTop: 4, fontSize: 13, fontWeight: '800', color: '#143055' },
  dayTextOn: { color: '#fff' },
  dayTextLocked: { color: '#94a3b8' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: '#2563eb' },
  chipText: { fontWeight: '700', color: '#143055' },
  chipTextOn: { color: '#fff' },
  continue: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueOff: { backgroundColor: '#cbd5e1' },
  continueText: { color: '#fff', fontWeight: '700' },
});
