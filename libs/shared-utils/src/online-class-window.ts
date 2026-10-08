/** Minutes before the scheduled start when a tutor or student may join. */
export const ONLINE_CLASS_EARLY_MINUTES = 5;

/** Minutes before the scheduled end when the wrap-up warning appears. */
export const ONLINE_CLASS_WRAP_UP_MINUTES = 5;

/** Minutes after the scheduled end that the call may continue. */
export const ONLINE_CLASS_EXTENSION_MINUTES = 5;

export const ONLINE_CLASS_WRAP_UP_MESSAGE = 'Wrap up in the next 5 minutes.';

/** Signaling payload the tutor sends when ending the class for everyone. */
export const ONLINE_CLASS_ENDED_TYPE = 'class-ended';

export function onlineClassEndedPayload(): string {
  return JSON.stringify({ type: ONLINE_CLASS_ENDED_TYPE });
}

export function isOnlineClassEndedMessage(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as { type?: string };
    return parsed?.type === ONLINE_CLASS_ENDED_TYPE;
  } catch {
    return false;
  }
}

/** Signaling payload so others can show this user's screen share on the stage. */
export const ONLINE_CLASS_SCREEN_SHARE_TYPE = 'screen-share';

export function onlineClassScreenSharePayload(sharing: boolean): string {
  return JSON.stringify({ type: ONLINE_CLASS_SCREEN_SHARE_TYPE, sharing });
}

/** Null when the message is not a screen-share signal. */
export function onlineClassScreenShareState(raw: string): boolean | null {
  try {
    const parsed = JSON.parse(raw) as { type?: string; sharing?: boolean };
    if (parsed?.type !== ONLINE_CLASS_SCREEN_SHARE_TYPE) {
      return null;
    }
    return Boolean(parsed.sharing);
  } catch {
    return null;
  }
}

export type OnlineClassWindow = {
  opensAt: Date;
  warnAt: Date;
  scheduledEnd: Date;
  hardEnd: Date;
};

/**
 * Clock for a booked online class.
 * A 3:00 pm class that lasts 60 minutes opens at 2:55, warns at 3:55,
 * is scheduled to end at 4:00, and closes at 4:05.
 */
export function onlineClassWindow(
  startsAt: Date | string,
  durationMinutes: number,
): OnlineClassWindow {
  const startMs = new Date(startsAt).getTime();
  if (Number.isNaN(startMs)) {
    throw new Error('Online class start time is invalid');
  }
  const minutes = durationMinutes > 0 ? durationMinutes : 60;
  const scheduledEndMs = startMs + minutes * 60 * 1000;
  return {
    opensAt: new Date(startMs - ONLINE_CLASS_EARLY_MINUTES * 60 * 1000),
    warnAt: new Date(scheduledEndMs - ONLINE_CLASS_WRAP_UP_MINUTES * 60 * 1000),
    scheduledEnd: new Date(scheduledEndMs),
    hardEnd: new Date(scheduledEndMs + ONLINE_CLASS_EXTENSION_MINUTES * 60 * 1000),
  };
}

/** True from the early open time until the hard end, exclusive of the hard end. */
export function canJoinOnlineClass(
  startsAt: Date | string | null | undefined,
  durationMinutes: number | null | undefined,
  now: Date = new Date(),
): boolean {
  if (startsAt == null || startsAt === '') {
    return false;
  }
  let window: OnlineClassWindow;
  try {
    window = onlineClassWindow(startsAt, durationMinutes ?? 60);
  } catch {
    return false;
  }
  const time = now.getTime();
  return time >= window.opensAt.getTime() && time < window.hardEnd.getTime();
}

export function onlineClassChannelName(sessionId: number | string): string {
  return `class-${sessionId}`;
}

/** First and last initials, so "Ada Lovelace" is "AL" and "Priya" is "P". */
export function nameInitials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '';
  }
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}
