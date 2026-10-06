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
