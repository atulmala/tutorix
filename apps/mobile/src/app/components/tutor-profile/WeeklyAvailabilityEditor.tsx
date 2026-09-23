import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import {
  GET_MY_TUTOR_CALENDAR_UPDATED_TILL,
  GET_MY_WEEKLY_UNAVAILABILITY,
} from '@tutorix/shared-graphql/queries';
import { SAVE_MY_WEEKLY_UNAVAILABILITY } from '@tutorix/shared-graphql/mutations';
import { useWeeklyAvailabilityEditor } from '../../hooks/useWeeklyAvailabilityEditor';

type WeeklyAvailabilityEditorProps = {
  onSaveError: (message: string | null) => void;
  onSaved?: () => void;
};

export function WeeklyAvailabilityEditor({
  onSaveError,
  onSaved,
}: WeeklyAvailabilityEditorProps) {
  const { data, loading, refetch } = useQuery(GET_MY_WEEKLY_UNAVAILABILITY, {
    fetchPolicy: 'network-only',
  });

  useQuery(GET_MY_TUTOR_CALENDAR_UPDATED_TILL, { fetchPolicy: 'network-only' });

  const ui = useWeeklyAvailabilityEditor({
    loadedUnavailable: data?.myWeeklyUnavailability ?? [],
    loading,
  });

  const [saveWeekly, { loading: saving }] = useMutation(SAVE_MY_WEEKLY_UNAVAILABILITY);

  const handleSave = async () => {
    onSaveError(null);
    try {
      await saveWeekly({
        variables: {
          input: { unavailableSlots: ui.unavailableSlotsForSave },
        },
      });
      await refetch();
      ui.markBaselineSaved();
      onSaved?.();
    } catch (err) {
      onSaveError(
        err instanceof Error ? err.message : 'Could not save availability.',
      );
    }
  };

  if (loading && !ui.hydrated) {
    return <ActivityIndicator style={{ marginVertical: 16 }} />;
  }

  return (
    <View>
      <Text style={styles.hint}>
        Weekdays default to unavailable before 2 PM; weekends are open. Tap to toggle unavailable
        (U). This repeats every week.
      </Text>

      <View style={styles.presetRow}>
        <Pressable style={styles.presetBtn} onPress={() => ui.applyDefaultWeeklyPreset()}>
          <Text style={styles.presetText}>School-day default</Text>
        </Pressable>
        <Pressable style={styles.presetBtn} onPress={() => ui.copyMondayToWeekdays()}>
          <Text style={styles.presetText}>Copy Mon → weekdays</Text>
        </Pressable>
      </View>
      <Pressable style={styles.clearBtn} onPress={() => ui.clearAllUnavailable()}>
        <Text style={styles.clearText}>Clear all blocks</Text>
      </Pressable>

      <Text style={styles.total}>Total: {ui.totalAvailableHoursPerWeek}h / week</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs}>
        {ui.weekdayLabels.map((label, index) => (
          <Pressable
            key={label}
            onPress={() => ui.setSelectedUiDay(index)}
            style={[styles.dayTab, ui.selectedUiDay === index && styles.dayTabOn]}
          >
            <Text style={[styles.dayTabText, ui.selectedUiDay === index && styles.dayTabTextOn]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.slotGrid}>
        {ui.slotsForSelectedDay.map((slot) => (
          <Pressable
            key={`${slot.dayOfWeek}-${slot.hour}-${slot.minute}`}
            onPress={() => ui.toggleSlot(slot.dayOfWeek, slot.hour, slot.minute)}
            style={[
              styles.slotCell,
              slot.unavailable ? styles.slotUnavailable : styles.slotAvailable,
            ]}
          >
            <Text style={styles.slotLabel} numberOfLines={1}>
              {slot.label}
            </Text>
            <Text style={styles.slotBadge}>{slot.unavailable ? 'U' : 'A'}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={ui.isDirty ? styles.dirty : styles.saved}>
          {ui.isDirty ? 'Unsaved changes' : 'All changes saved'}
        </Text>
        <Pressable
          style={[styles.saveBtn, (!ui.isDirty || saving) && styles.saveBtnDisabled]}
          disabled={!ui.isDirty || saving}
          onPress={() => void handleSave()}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save weekly schedule'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: '#0f766e', marginBottom: 12, lineHeight: 18 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  presetBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  clearBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  clearText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  total: { fontSize: 13, fontWeight: '700', color: '#059669', marginBottom: 8 },
  dayTabs: { marginBottom: 8, maxHeight: 40 },
  dayTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 6,
    backgroundColor: '#f1f5f9',
  },
  dayTabOn: { backgroundColor: '#0284c7' },
  dayTabText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  dayTabTextOn: { color: '#fff' },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  slotCell: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  slotAvailable: { backgroundColor: '#ecfdf5', borderColor: '#6ee7b7' },
  slotUnavailable: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  slotLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: '#0f172a' },
  slotBadge: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  footer: { marginTop: 12, gap: 8 },
  dirty: { fontSize: 13, color: '#b45309' },
  saved: { fontSize: 13, color: '#64748b' },
  saveBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
