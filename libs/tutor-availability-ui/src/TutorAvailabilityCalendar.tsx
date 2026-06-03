import React, { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  GET_MY_TUTOR_CALENDAR,
  GET_MY_TUTOR_CALENDAR_UPDATED_TILL,
  SAVE_MY_TUTOR_CALENDAR,
} from '@tutorix/shared-graphql';
import {
  formatAvailabilityUpdatedTill,
  formatIstDayHeader,
  formatSlotTimeLabel,
} from '@tutorix/shared-utils';
import { useAvailabilityEditor, type CalendarSlotRow } from './useAvailabilityEditor';

export type TutorAvailabilityCalendarProps = {
  onSaveError?: (message: string | null) => void;
  onUpdatedTill?: (info: { label: string | null; loading: boolean }) => void;
};

export function TutorAvailabilityCalendar({
  onSaveError,
  onUpdatedTill,
}: TutorAvailabilityCalendarProps) {
  const gestureRef = useRef<{
    active: boolean;
    paintAdd: boolean;
    visited: Set<string>;
  } | null>(null);
  const blockClickRef = useRef(false);
  const rangeProbe = useAvailabilityEditor({ loadedSlots: [], loading: false });

  const { data, loading, refetch } = useQuery(GET_MY_TUTOR_CALENDAR, {
    variables: { from: rangeProbe.rangeStart, to: rangeProbe.rangeEnd },
    fetchPolicy: 'network-only',
  });

  const {
    data: updatedTillData,
    loading: updatedTillLoading,
    refetch: refetchUpdatedTill,
  } = useQuery(GET_MY_TUTOR_CALENDAR_UPDATED_TILL, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (!onUpdatedTill) return;
    if (updatedTillLoading) {
      onUpdatedTill({ label: null, loading: true });
      return;
    }
    const raw = updatedTillData?.myTutorCalendarUpdatedTill;
    const label = raw ? formatAvailabilityUpdatedTill(new Date(raw)) : null;
    onUpdatedTill({ label, loading: false });
  }, [onUpdatedTill, updatedTillData, updatedTillLoading]);

  const loadedSlots: CalendarSlotRow[] = data?.myTutorCalendar ?? [];

  const ui = useAvailabilityEditor({ loadedSlots, loading });

  const [saveCalendar, { loading: saving }] = useMutation(SAVE_MY_TUTOR_CALENDAR);

  useEffect(() => {
    const onUp = () => {
      gestureRef.current = null;
      blockClickRef.current = true;
      window.setTimeout(() => {
        blockClickRef.current = false;
      }, 0);
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  const paintCell = useCallback(
    (key: string, disabled: boolean) => {
      if (disabled) return;
      const gesture = gestureRef.current;
      if (!gesture?.active) return;
      if (gesture.visited.has(key)) return;
      gesture.visited.add(key);
      ui.toggleKey(key, gesture.paintAdd);
    },
    [ui],
  );

  const startPaintGesture = useCallback(
    (key: string, disabled: boolean, paintAdd: boolean) => {
      if (disabled) return;
      gestureRef.current = {
        active: true,
        paintAdd,
        visited: new Set(),
      };
      paintCell(key, disabled);
    },
    [paintCell],
  );

  const handleSave = async () => {
    onSaveError?.(null);
    try {
      await saveCalendar({
        variables: {
          input: {
            rangeStart: ui.rangeStart,
            rangeEnd: ui.rangeEnd,
            slotStarts: ui.slotStartsForSave,
          },
        },
      });
      await Promise.all([refetch(), refetchUpdatedTill()]);
      ui.markBaselineSaved();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not save availability.';
      onSaveError?.(message);
      throw err;
    }
  };

  const navigateWeek = {
    goPrev: () => {
      ui.goPrev();
      rangeProbe.goPrev();
    },
    goNext: () => {
      ui.goNext();
      rangeProbe.goNext();
    },
  };

  const timeSlots = ui.timeSlots;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={navigateWeek.goPrev}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            aria-label="Previous week"
          >
            ←
          </button>
          <span className="min-w-[8rem] text-center text-sm font-medium text-slate-800">
            {ui.viewLabel}
          </span>
          <button
            type="button"
            onClick={navigateWeek.goNext}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            aria-label="Next week"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded border border-emerald-600 bg-emerald-500 text-[10px] font-bold text-white">
              A
            </span>
            Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-5 w-5 rounded border border-slate-300 bg-white" />
            Not available
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading calendar…</p>
      ) : (
        <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm select-none">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-16 border-b border-r border-slate-200 bg-slate-50 px-1 py-1.5 text-left font-medium text-slate-600">
                  Date
                </th>
                {timeSlots.map((slot, timeIndex) => (
                  <th
                    key={`${slot.hour}-${slot.minute}`}
                    className="border-b border-slate-200 bg-slate-50 px-0.5 py-1 text-center font-medium text-slate-600"
                  >
                    <button
                      type="button"
                      className="w-full text-[9px] leading-tight hover:text-sky-700 hover:underline"
                      onClick={() => ui.toggleTimeColumn(timeIndex)}
                      title="Toggle this time for all days this week"
                    >
                      {formatSlotTimeLabel(slot.hour, slot.minute)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ui.grid.days.map((day, dayIndex) => {
                const dayCells = ui.grid.cells[dayIndex] ?? [];
                return (
                  <tr key={day.toISOString()}>
                    <td className="sticky left-0 z-10 border-r border-slate-100 bg-slate-50 px-1 py-1 text-slate-700">
                      <button
                        type="button"
                        className="block text-left text-[11px] font-medium leading-tight hover:text-sky-700 hover:underline"
                        onClick={() => ui.toggleDayRow(dayIndex)}
                        title="Toggle all times for this day"
                      >
                        {formatIstDayHeader(day)}
                      </button>
                      <button
                        type="button"
                        className="mt-0.5 block text-[9px] font-normal text-sky-600 hover:underline"
                        onClick={() => ui.clearDay(dayIndex)}
                      >
                        Clear
                      </button>
                    </td>
                    {dayCells.map((cell) => {
                      const selected = ui.selectedKeys.has(cell.key);
                      return (
                        <td
                          key={cell.key}
                          className="border-b border-slate-50 p-0.5 text-center"
                          onMouseEnter={() => paintCell(cell.key, cell.disabled)}
                        >
                          <button
                            type="button"
                            disabled={cell.disabled}
                            aria-pressed={selected}
                            aria-label={
                              selected
                                ? `${cell.key} available`
                                : `${cell.key} not available`
                            }
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            className={`mx-auto flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold transition-colors ${
                              cell.disabled
                                ? 'cursor-not-allowed border-transparent bg-slate-100 opacity-40'
                                : selected
                                  ? 'border-emerald-600 bg-emerald-500 text-white hover:bg-emerald-600'
                                  : 'border-slate-300 bg-white text-transparent hover:border-sky-400'
                            }`}
                            onMouseDown={(e) => {
                              if (cell.disabled) return;
                              e.preventDefault();
                              startPaintGesture(cell.key, cell.disabled, !selected);
                            }}
                            onMouseEnter={() => paintCell(cell.key, cell.disabled)}
                            onClick={(e) => {
                              if (cell.disabled) return;
                              if (blockClickRef.current) {
                                e.preventDefault();
                                return;
                              }
                              ui.toggleKey(cell.key);
                            }}
                          >
                            {selected ? 'A' : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {ui.isDirty ? (
          <span className="text-sm text-amber-700">Unsaved changes</span>
        ) : (
          <span className="text-sm text-slate-500">All changes saved</span>
        )}
        <button
          type="button"
          disabled={!ui.isDirty || saving || loading}
          onClick={() => void handleSave()}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
