/**
 * Weekly recurring tutor availability (IST). Default = available; blocks are opt-out.
 */

import {
  addIstDaysUtc,
  istDayStartUtc,
  istSlotToUtc,
  listDailySlotStarts,
  maxHorizonEndUtc,
  toIstParts,
  validateSlotInstant,
  IST_OFFSET_MS,
} from './tutor-calendar';

/** JS-style IST weekday: 0 = Sunday … 6 = Saturday. */
export function istDayOfWeekFromDayStart(dayStartUtc: Date): number {
  return new Date(dayStartUtc.getTime() + IST_OFFSET_MS).getUTCDay();
}

export type WeeklyUnavailabilityBlock = {
  dayOfWeek: number;
  hour: number;
  minute: number;
};

export function weeklyUnavailabilityKey(
  dayOfWeek: number,
  hour: number,
  minute: number,
): string {
  return `${dayOfWeek}-${hour}-${minute}`;
}

export function parseWeeklyUnavailabilityKey(
  key: string,
): WeeklyUnavailabilityBlock | null {
  const m = /^(\d)-(\d{1,2})-(\d{1,2})$/.exec(key.trim());
  if (!m) return null;
  const dayOfWeek = Number(m[1]);
  const hour = Number(m[2]);
  const minute = Number(m[3]);
  if (dayOfWeek < 0 || dayOfWeek > 6) return null;
  return { dayOfWeek, hour, minute };
}

export function unavailableKeysFromBlocks(
  blocks: WeeklyUnavailabilityBlock[],
): Set<string> {
  return new Set(
    blocks.map((b) => weeklyUnavailabilityKey(b.dayOfWeek, b.hour, b.minute)),
  );
}

export function isWeeklySlotUnavailable(
  dayOfWeek: number,
  hour: number,
  minute: number,
  unavailableKeys: Set<string>,
): boolean {
  return unavailableKeys.has(weeklyUnavailabilityKey(dayOfWeek, hour, minute));
}

/** UI order: Mon … Sun → IST day-of-week values. */
export const UI_WEEKDAY_TO_IST_DOW = [1, 2, 3, 4, 5, 6, 0] as const;

export function uiWeekdayIndexToIstDow(uiIndex: number): number {
  return UI_WEEKDAY_TO_IST_DOW[uiIndex] ?? 1;
}

export function istDowToUiWeekdayIndex(dow: number): number {
  const idx = UI_WEEKDAY_TO_IST_DOW.indexOf(dow as (typeof UI_WEEKDAY_TO_IST_DOW)[number]);
  return idx >= 0 ? idx : 0;
}

/** Expand weekly blocks to concrete available slot starts from now through horizon. */
export function materializedAvailableSlotStarts(
  unavailableKeys: Set<string>,
  now = new Date(),
): Date[] {
  const horizon = maxHorizonEndUtc(now);
  const todayStart = istDayStartUtc(
    toIstParts(now).year,
    toIstParts(now).month,
    toIstParts(now).day,
  );
  const starts: Date[] = [];
  const seen = new Set<string>();

  for (
    let dayStart = todayStart;
    dayStart < horizon;
    dayStart = addIstDaysUtc(dayStart, 1)
  ) {
    const dow = istDayOfWeekFromDayStart(dayStart);
    const p = toIstParts(dayStart);
    for (const slot of listDailySlotStarts()) {
      if (isWeeklySlotUnavailable(dow, slot.hour, slot.minute, unavailableKeys)) {
        continue;
      }
      const startsAt = istSlotToUtc(
        p.year,
        p.month,
        p.day,
        slot.hour,
        slot.minute,
      );
      const validation = validateSlotInstant(startsAt, now);
      if (validation.ok === false) continue;
      const iso = startsAt.toISOString();
      if (seen.has(iso)) continue;
      seen.add(iso);
      starts.push(startsAt);
    }
  }

  starts.sort((a, b) => a.getTime() - b.getTime());
  return starts;
}

/** Mon–Fri: unavailable before 14:00 (school hours). Sat–Sun: fully available. */
export function defaultWeeklyUnavailableKeys(): Set<string> {
  const keys = new Set<string>();
  for (const dow of [1, 2, 3, 4, 5]) {
    for (const slot of listDailySlotStarts()) {
      if (slot.hour < 14) {
        keys.add(weeklyUnavailabilityKey(dow, slot.hour, slot.minute));
      }
    }
  }
  return keys;
}

export function unavailableKeysToBlocks(
  keys: Set<string>,
): WeeklyUnavailabilityBlock[] {
  const blocks: WeeklyUnavailabilityBlock[] = [];
  for (const key of keys) {
    const parsed = parseWeeklyUnavailabilityKey(key);
    if (parsed) blocks.push(parsed);
  }
  blocks.sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek ||
      a.hour - b.hour ||
      a.minute - b.minute,
  );
  return blocks;
}

