import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatSlotTimeAmPmLabel,
  listDailySlotStarts,
  unavailableKeysFromBlocks,
  type WeeklyUnavailabilityBlock,
  weeklyUnavailabilityKey,
  uiWeekdayIndexToIstDow,
  istDowToUiWeekdayIndex,
  defaultWeeklyUnavailableKeys,
} from '@tutorix/shared-utils';

export type WeeklySlotRow = WeeklyUnavailabilityBlock;

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

export function useWeeklyAvailabilityEditor(options: {
  loadedUnavailable: WeeklySlotRow[];
  loading?: boolean;
}) {
  const { loadedUnavailable, loading = false } = options;
  const [unavailableKeys, setUnavailableKeys] = useState<Set<string>>(new Set());
  const [baselineKeys, setBaselineKeys] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'day'>('day');
  const [selectedUiDay, setSelectedUiDay] = useState(0);

  const timeSlots = useMemo(() => listDailySlotStarts(), []);

  useEffect(() => {
    if (loading) return;
    const keys = unavailableKeysFromBlocks(loadedUnavailable);
    setUnavailableKeys(keys);
    setBaselineKeys(new Set(keys));
    setHydrated(true);
  }, [loadedUnavailable, loading]);

  const isDirty = useMemo(
    () => !setsEqual(baselineKeys, unavailableKeys),
    [baselineKeys, unavailableKeys],
  );

  const toggleSlot = useCallback((dayOfWeek: number, hour: number, minute: number) => {
    const key = weeklyUnavailabilityKey(dayOfWeek, hour, minute);
    setUnavailableKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearAllUnavailable = useCallback(() => {
    setUnavailableKeys(new Set());
  }, []);

  const applyDefaultWeeklyPreset = useCallback(() => {
    setUnavailableKeys(defaultWeeklyUnavailableKeys());
  }, []);

  const copyMondayToWeekdays = useCallback(() => {
    setUnavailableKeys((prev) => {
      const next = new Set(prev);
      const monDow = uiWeekdayIndexToIstDow(0);
      const monKeys = [...prev].filter((k) => k.startsWith(`${monDow}-`));
      for (const uiIndex of [1, 2, 3, 4]) {
        const dow = uiWeekdayIndexToIstDow(uiIndex);
        for (const key of [...next]) {
          if (key.startsWith(`${dow}-`)) next.delete(key);
        }
        for (const monKey of monKeys) {
          const parts = monKey.split('-');
          const hour = parts[1];
          const minute = parts[2];
          next.add(`${dow}-${hour}-${minute}`);
        }
      }
      return next;
    });
  }, []);

  const unavailableSlotsForSave = useMemo((): WeeklySlotRow[] => {
    return [...unavailableKeys]
      .map((key) => {
        const [d, h, m] = key.split('-');
        return {
          dayOfWeek: Number(d),
          hour: Number(h),
          minute: Number(m),
        };
      })
      .filter(
        (row) =>
          row.dayOfWeek >= 0 &&
          row.dayOfWeek <= 6 &&
          Number.isFinite(row.hour) &&
          Number.isFinite(row.minute),
      );
  }, [unavailableKeys]);

  const markBaselineSaved = useCallback(() => {
    setBaselineKeys(new Set(unavailableKeys));
  }, [unavailableKeys]);

  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const slotsForSelectedDay = useMemo(() => {
    const dow = uiWeekdayIndexToIstDow(selectedUiDay);
    return timeSlots.map((slot) => ({
      ...slot,
      dayOfWeek: dow,
      unavailable: unavailableKeys.has(
        weeklyUnavailabilityKey(dow, slot.hour, slot.minute),
      ),
      label: formatSlotTimeAmPmLabel(slot.hour, slot.minute),
    }));
  }, [selectedUiDay, timeSlots, unavailableKeys]);

  const totalAvailableHoursPerWeek = useMemo(() => {
    let count = 0;
    for (let ui = 0; ui < 7; ui++) {
      const dow = uiWeekdayIndexToIstDow(ui);
      for (const slot of timeSlots) {
        if (!unavailableKeys.has(weeklyUnavailabilityKey(dow, slot.hour, slot.minute))) {
          count += 1;
        }
      }
    }
    return count;
  }, [timeSlots, unavailableKeys]);

  return {
    hydrated,
    viewMode,
    setViewMode,
    selectedUiDay,
    setSelectedUiDay,
    weekdayLabels,
    uiWeekdayIndexToIstDow,
    istDowToUiWeekdayIndex,
    timeSlots,
    unavailableKeys,
    isDirty,
    toggleSlot,
    clearAllUnavailable,
    applyDefaultWeeklyPreset,
    copyMondayToWeekdays,
    unavailableSlotsForSave,
    markBaselineSaved,
    slotsForSelectedDay,
    totalAvailableHoursPerWeek,
  };
}
