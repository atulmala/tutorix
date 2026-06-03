import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildSlotGrid,
  clampViewStartUtc,
  formatViewRangeLabel,
  istTodayStartUtc,
  rangeForVisibleGrid,
  shiftViewStart,
  slotKeyFromInstant,
  type CalendarViewMode,
} from '@tutorix/shared-utils';

export type CalendarSlotRow = {
  id: string;
  startsAt: string;
};

export type UseAvailabilityEditorOptions = {
  loadedSlots: CalendarSlotRow[];
  loading?: boolean;
  now?: Date;
};

export function useAvailabilityEditor({
  loadedSlots,
  loading = false,
  now,
}: UseAvailabilityEditorOptions) {
  const [mode, setMode] = useState<CalendarViewMode>('week');
  const [viewStartUtc, setViewStartUtc] = useState(() =>
    clampViewStartUtc(istTodayStartUtc(now), 'week', now),
  );
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [baselineKeys, setBaselineKeys] = useState<Set<string>>(new Set());
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  const { rangeStart, rangeEnd } = useMemo(
    () => rangeForVisibleGrid(viewStartUtc, mode),
    [viewStartUtc, mode],
  );

  const rangeKey = `${rangeStart.toISOString()}|${rangeEnd.toISOString()}`;

  const loadedFingerprint = useMemo(
    () => loadedSlots.map((s) => `${s.id}|${s.startsAt}`).join(','),
    [loadedSlots],
  );

  const hydrateKey = `${rangeKey}|${loadedFingerprint}`;

  useEffect(() => {
    if (loading) return;
    if (hydratedKey === hydrateKey) return;
    const keys = new Set(
      loadedSlots.map((s) => slotKeyFromInstant(new Date(s.startsAt))),
    );
    setSelectedKeys(keys);
    setBaselineKeys(new Set(keys));
    setHydratedKey(hydrateKey);
  }, [loadedSlots, loading, hydrateKey, hydratedKey, loadedFingerprint]);

  useEffect(() => {
    setViewStartUtc((prev) => clampViewStartUtc(prev, mode, now));
  }, [mode, now]);

  const grid = useMemo(
    () =>
      buildSlotGrid({
        viewStartUtc,
        mode,
        selectedKeys,
        now,
      }),
    [viewStartUtc, mode, selectedKeys, now],
  );

  const isDirty = useMemo(() => {
    if (baselineKeys.size !== selectedKeys.size) return true;
    for (const k of selectedKeys) {
      if (!baselineKeys.has(k)) return true;
    }
    return false;
  }, [baselineKeys, selectedKeys]);

  const toggleKey = useCallback((key: string, force?: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const on = force ?? !next.has(key);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const toggleDayRow = useCallback(
    (dayIndex: number, force?: boolean) => {
      const dayCells = grid.cells[dayIndex];
      if (!dayCells) return;
      const keys = dayCells.filter((c) => !c.disabled).map((c) => c.key);
      const allOn = keys.every((k) => selectedKeys.has(k));
      const targetOn = force ?? !allOn;
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        for (const k of keys) {
          if (targetOn) next.add(k);
          else next.delete(k);
        }
        return next;
      });
    },
    [grid.cells, selectedKeys],
  );

  const toggleTimeColumn = useCallback(
    (timeIndex: number, force?: boolean) => {
      const keys = grid.cells
        .map((dayCells) => dayCells[timeIndex])
        .filter((c): c is NonNullable<typeof c> => Boolean(c && !c.disabled))
        .map((c) => c.key);
      const allOn = keys.length > 0 && keys.every((k) => selectedKeys.has(k));
      const targetOn = force ?? !allOn;
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        for (const k of keys) {
          if (targetOn) next.add(k);
          else next.delete(k);
        }
        return next;
      });
    },
    [grid.cells, selectedKeys],
  );

  const clearDay = useCallback(
    (dayIndex: number) => {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        const dayCells = grid.cells[dayIndex];
        if (!dayCells) return next;
        for (const cell of dayCells) {
          if (!cell.disabled) next.delete(cell.key);
        }
        return next;
      });
    },
    [grid.cells],
  );

  const markBaselineSaved = useCallback(() => {
    setBaselineKeys(new Set(selectedKeys));
  }, [selectedKeys]);

  const slotStartsForSave = useMemo(() => {
    return [...selectedKeys]
      .map((key) => grid.cells.flat().find((c) => c.key === key)?.startsAtUtc)
      .filter((d): d is Date => d != null);
  }, [selectedKeys, grid.cells]);

  const viewLabel = useMemo(
    () => formatViewRangeLabel(viewStartUtc, mode),
    [viewStartUtc, mode],
  );

  const goPrev = useCallback(() => {
    setViewStartUtc((v) => shiftViewStart(v, mode, -1, now));
    setHydratedKey(null);
  }, [mode, now]);

  const goNext = useCallback(() => {
    setViewStartUtc((v) => shiftViewStart(v, mode, 1, now));
    setHydratedKey(null);
  }, [mode, now]);

  const setViewMode = useCallback((next: CalendarViewMode) => {
    if (next !== 'week') return;
    setMode('week');
    setViewStartUtc((v) => clampViewStartUtc(v, 'week', now));
    setHydratedKey(null);
  }, [now]);

  return {
    mode: 'week' as CalendarViewMode,
    setViewMode,
    viewStartUtc,
    viewLabel,
    goPrev,
    goNext,
    grid,
    selectedKeys,
    toggleKey,
    toggleDayRow,
    toggleTimeColumn,
    clearDay,
    timeSlots: grid.timeSlots,
    isDirty,
    rangeStart,
    rangeEnd,
    slotStartsForSave,
    markBaselineSaved,
  };
}
