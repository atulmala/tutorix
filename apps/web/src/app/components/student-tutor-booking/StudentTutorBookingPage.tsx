import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { TUTOR_BOOKABLE_SLOTS, TUTOR_SEARCH_DETAIL } from '@tutorix/shared-graphql';
import {
  bookingCalendarFromDraft,
  bookingDaysWithSlots,
  bookingHorizonRange,
  formatIstBookingChipLabel,
  istDayKey,
  lockedDeliveryMode,
  SLOT_DURATION_MINUTES,
  weekOffsetsWithSlots,
  type StudentBookingDeliveryMode,
  type StudentBookingDraft,
} from '@tutorix/shared-utils';

type StudentTutorBookingPageProps = {
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

export const StudentTutorBookingPage: React.FC<StudentTutorBookingPageProps> = ({
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
    return <p className="text-sm text-muted">Loading calendar…</p>;
  }
  if (detailError || !detail || !offering) {
    return <p className="text-sm text-danger">Could not load this tutor’s calendar.</p>;
  }

  const bothModes =
    offering.offlineEnabled && offering.onlineEnabled && !lockedFromCredit;

  return (
    <div className="w-full max-w-xl space-y-4">
      <div>
        <h1 className="text-[26px] font-extrabold text-[#143055]">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {detail.displayName} · {offering.offeringLabel} · {SLOT_DURATION_MINUTES} min
        </p>
      </div>

      {bothModes ? (
        <div className="flex gap-2">
          {(['offline', 'online'] as const).map((mode) => {
            const on = deliveryMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setDeliveryMode(mode);
                  setSelectedSlotId(null);
                  setSelectedKey(null);
                }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                  on ? 'bg-[#2563eb] text-white' : 'bg-white text-[#143055]'
                }`}
              >
                {mode === 'offline' ? 'Offline' : 'Online'}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm font-semibold text-[#143055]">
          {deliveryMode === 'online' ? 'Online' : 'Offline'}
        </p>
      )}

      {availableOffsets.length > 1 ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (prevOffset == null) {
                return;
              }
              setWeekOffset(prevOffset);
              setSelectedKey(null);
              setSelectedSlotId(null);
            }}
            disabled={prevOffset == null}
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#2563eb] disabled:text-slate-300"
          >
            Previous week
          </button>
          <button
            type="button"
            onClick={() => {
              if (nextOffset == null) {
                return;
              }
              setWeekOffset(nextOffset);
              setSelectedKey(null);
              setSelectedSlotId(null);
            }}
            disabled={nextOffset == null}
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#2563eb] disabled:text-slate-300"
          >
            Next week
          </button>
        </div>
      ) : null}

      {weekDays.length > 0 ? (
        <div className="flex flex-wrap gap-1 rounded-[18px] bg-white p-2">
          {weekDays.map((day) => {
            const on = !datesLocked && day.key === activeKey;
            return (
              <button
                key={day.key}
                type="button"
                disabled={datesLocked}
                onClick={() => {
                  if (datesLocked) {
                    return;
                  }
                  setSelectedKey(day.key);
                  setSelectedSlotId(null);
                }}
                aria-label={`${day.abbr} ${day.day} ${day.monthAbbr}`}
                aria-pressed={on}
                className={`flex min-w-[3.5rem] flex-col items-center rounded-xl px-2 py-2 ${
                  datesLocked
                    ? 'cursor-not-allowed text-slate-400'
                    : on
                      ? 'bg-[#2563eb] text-white'
                      : 'text-[#143055]'
                }`}
              >
                <span className={`text-[10px] font-bold tracking-wide ${on ? 'text-white' : 'text-slate-400'}`}>
                  {day.abbr}
                </span>
                <span className="mt-1 text-sm font-extrabold">
                  {day.day} {day.monthAbbr}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <section className="rounded-[20px] bg-white p-5">
        {!deliveryMode ? (
          <p className="text-sm text-slate-500">Choose Online or Offline to see 1-hour slots.</p>
        ) : slotsLoading ? (
          <p className="text-sm text-slate-500">Loading 1-hour slots…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-slate-500">No open 1-hour slots.</p>
        ) : daySlots.length === 0 ? (
          <p className="text-sm text-slate-500">No open 1-hour slots on this day.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {daySlots.map((slot) => {
              const on = slot.tutorCalendarId === selectedSlotId;
              return (
                <button
                  key={slot.tutorCalendarId}
                  type="button"
                  onClick={() => setSelectedSlotId(slot.tutorCalendarId)}
                  className={`rounded-full px-3 py-2 text-sm font-semibold ${
                    on ? 'bg-[#2563eb] text-white' : 'bg-sky-50 text-[#143055]'
                  }`}
                >
                  {formatIstBookingChipLabel(new Date(slot.startsAt))}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <button
        type="button"
        disabled={!selectedSlot || !deliveryMode}
        onClick={() => {
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
        className="w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:bg-slate-300"
      >
        {submitLabel}
      </button>
    </div>
  );
};
