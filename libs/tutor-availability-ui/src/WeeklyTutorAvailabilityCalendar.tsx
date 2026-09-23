import React from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  GET_MY_TUTOR_CALENDAR_UPDATED_TILL,
  GET_MY_WEEKLY_UNAVAILABILITY,
} from '@tutorix/shared-graphql/queries';
import { SAVE_MY_WEEKLY_UNAVAILABILITY } from '@tutorix/shared-graphql/mutations';
import {
  formatAvailabilityUpdatedTill,
  formatSlotTimeAmPmLabel,
  weeklyUnavailabilityKey,
} from '@tutorix/shared-utils';
import { useWeeklyAvailabilityEditor } from './useWeeklyAvailabilityEditor';

export type WeeklyTutorAvailabilityCalendarProps = {
  readOnly?: boolean;
  onSaveError?: (message: string | null) => void;
  onUpdatedTill?: (info: { label: string | null; loading: boolean }) => void;
  onSaved?: () => void;
};

export function WeeklyTutorAvailabilityCalendar({
  readOnly = false,
  onSaveError,
  onUpdatedTill,
  onSaved,
}: WeeklyTutorAvailabilityCalendarProps) {
  const interactive = !readOnly;

  const { data, loading, refetch } = useQuery(GET_MY_WEEKLY_UNAVAILABILITY, {
    fetchPolicy: 'network-only',
  });

  const {
    data: updatedTillData,
    loading: updatedTillLoading,
    refetch: refetchUpdatedTill,
  } = useQuery(GET_MY_TUTOR_CALENDAR_UPDATED_TILL, {
    fetchPolicy: 'network-only',
  });

  React.useEffect(() => {
    if (!onUpdatedTill) return;
    if (updatedTillLoading) {
      onUpdatedTill({ label: null, loading: true });
      return;
    }
    const raw = updatedTillData?.myTutorCalendarUpdatedTill;
    const label = raw ? formatAvailabilityUpdatedTill(new Date(raw)) : null;
    onUpdatedTill({ label, loading: false });
  }, [onUpdatedTill, updatedTillData, updatedTillLoading]);

  const ui = useWeeklyAvailabilityEditor({
    loadedUnavailable: data?.myWeeklyUnavailability ?? [],
    loading,
  });

  const [saveWeekly, { loading: saving }] = useMutation(SAVE_MY_WEEKLY_UNAVAILABILITY);

  const handleSave = async () => {
    onSaveError?.(null);
    try {
      await saveWeekly({
        variables: {
          input: { unavailableSlots: ui.unavailableSlotsForSave },
        },
      });
      await Promise.all([refetch(), refetchUpdatedTill()]);
      ui.markBaselineSaved();
      onSaved?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not save availability.';
      onSaveError?.(message);
      throw err;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Weekly schedule</h2>
        <p className="mt-1 text-sm text-slate-600">
          Weekdays default to unavailable before 2 PM (school hours); weekends are open. Tap to
          toggle unavailable (U). This pattern repeats every week.
        </p>
      </div>

      {interactive ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
            onClick={() => ui.applyDefaultWeeklyPreset()}
          >
            School-day default
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
            onClick={() => ui.copyMondayToWeekdays()}
          >
            Copy Mon → weekdays
          </button>
          <button
            type="button"
            className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
            onClick={() => ui.clearAllUnavailable()}
          >
            Clear all blocks
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded border border-emerald-600 bg-emerald-500 text-[10px] font-bold text-white">
            A
          </span>
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded border border-red-600 bg-red-500 text-[10px] font-bold text-white">
            U
          </span>
          Unavailable
        </span>
        <span className="ml-auto text-sm font-semibold text-emerald-700">
          Total: {ui.totalAvailableHoursPerWeek}h / week
        </span>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Day of week"
      >
        {ui.weekdayLabels.map((label, index) => {
          const selected = ui.selectedUiDay === index;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => ui.setSelectedUiDay(index)}
              className={`min-w-[3.25rem] flex-1 rounded-lg border px-2 py-2.5 text-xs font-bold transition-colors ${
                selected
                  ? 'border-sky-500 bg-sky-600 text-white shadow-md ring-2 ring-sky-200 ring-offset-1'
                  : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800'
              } ${!interactive ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading weekly schedule…</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {ui.slotsForSelectedDay.map((slot) => (
            <button
              key={`${slot.dayOfWeek}-${slot.hour}-${slot.minute}`}
              type="button"
              disabled={!interactive}
              onClick={() => ui.toggleSlot(slot.dayOfWeek, slot.hour, slot.minute)}
              className={`flex flex-row items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                slot.unavailable
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              } ${!interactive ? 'cursor-default' : ''}`}
            >
              <span className="min-w-0 flex-1 truncate leading-tight">{slot.label}</span>
              <span className="shrink-0 font-bold">{slot.unavailable ? 'U' : 'A'}</span>
            </button>
          ))}
        </div>
      )}

      {ui.viewMode === 'grid' ? null : null}

      {interactive ? (
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
            {saving ? 'Saving…' : 'Save weekly schedule'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Compact 7-day grid row for power users (optional toggle later). */
export function WeeklyGridSnippet({
  ui,
  interactive,
}: {
  ui: ReturnType<typeof useWeeklyAvailabilityEditor>;
  interactive: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th />
            {ui.timeSlots.map((slot) => (
              <th key={`${slot.hour}-${slot.minute}`} className="p-1 font-medium text-slate-500">
                {formatSlotTimeAmPmLabel(slot.hour, slot.minute)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ui.weekdayLabels.map((label, uiIndex) => {
            const dow = ui.uiWeekdayIndexToIstDow(uiIndex);
            return (
              <tr key={label}>
                <td className="pr-2 font-semibold text-slate-700">{label}</td>
                {ui.timeSlots.map((slot) => {
                  const unavailable = ui.unavailableKeys.has(
                    weeklyUnavailabilityKey(dow, slot.hour, slot.minute),
                  );
                  return (
                    <td key={`${dow}-${slot.hour}-${slot.minute}`} className="p-0.5">
                      <button
                        type="button"
                        disabled={!interactive}
                        onClick={() => ui.toggleSlot(dow, slot.hour, slot.minute)}
                        className={`h-4 w-4 rounded border text-[8px] font-bold ${
                          unavailable
                            ? 'border-red-600 bg-red-500 text-white'
                            : 'border-emerald-600 bg-emerald-500 text-white'
                        }`}
                      >
                        {unavailable ? 'U' : 'A'}
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
  );
}
