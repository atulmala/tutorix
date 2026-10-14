/** Minutes before the scheduled start when a tutor or student may join. */
export const ONLINE_CLASS_EARLY_MINUTES = 5;

/** Minutes before the scheduled end when the wrap-up warning appears. */
export const ONLINE_CLASS_WRAP_UP_MINUTES = 5;

/** Minutes after the scheduled end that the call may continue. */
export const ONLINE_CLASS_EXTENSION_MINUTES = 5;

/**
 * Minutes before the scheduled end inside which the tutor may end the class
 * without confirming, and after which an ended class cannot be restarted.
 */
export const ONLINE_CLASS_RESTART_CUTOFF_MINUTES = 5;

export const ONLINE_CLASS_WRAP_UP_MESSAGE = 'Wrap up in the next 5 minutes.';

export const ONLINE_CLASS_ENDED_MESSAGE = 'This class has ended';

export const ONLINE_CLASS_END_CONFIRM_MESSAGE = 'Are you sure to end this class?';

/** True while more than the restart cutoff remains before the scheduled end. */
export function onlineClassHasTimeLeft(
  scheduledEnd: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (scheduledEnd == null || scheduledEnd === '') {
    return false;
  }
  const endMs = new Date(scheduledEnd).getTime();
  if (Number.isNaN(endMs)) {
    return false;
  }
  return endMs - now.getTime() > ONLINE_CLASS_RESTART_CUTOFF_MINUTES * 60 * 1000;
}

/** True when a join failed because the class is over (GraphQL error text). */
export function isOnlineClassEndedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes(ONLINE_CLASS_ENDED_MESSAGE);
}

/**
 * Shared whiteboard stage, height divided by width.
 * The class screen is portrait, so a landscape 16:9 stage leaves checkerboard
 * bands above and below the page. Every device must use this same ratio.
 */
export const ONLINE_CLASS_WHITEBOARD_HEIGHT_RATIO = 3 / 2;

/** Largest stage of the shared ratio that fits in a board slot. */
export function fitWhiteboardStage(
  width: number,
  height: number,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) {
    return { width: 0, height: 0 };
  }
  const fittedWidth = height / ONLINE_CLASS_WHITEBOARD_HEIGHT_RATIO;
  if (fittedWidth <= width) {
    return { width: fittedWidth, height };
  }
  return { width, height: width * ONLINE_CLASS_WHITEBOARD_HEIGHT_RATIO };
}

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

export type TutorOnlineClassAction = 'start' | 'restart' | 'ended';

export const TUTOR_ONLINE_CLASS_START_LABEL = 'Start Class';

export const TUTOR_ONLINE_CLASS_RESTART_LABEL = 'Restart Class';

/**
 * What the tutor's schedule card offers for an online class, or null outside
 * the join window. An ended class can be restarted only while more than the
 * restart cutoff remains before the scheduled end.
 */
export function tutorOnlineClassAction(
  startsAt: Date | string | null | undefined,
  durationMinutes: number | null | undefined,
  endedAt: Date | string | null | undefined,
  now: Date = new Date(),
): TutorOnlineClassAction | null {
  if (startsAt == null || startsAt === '' || !canJoinOnlineClass(startsAt, durationMinutes, now)) {
    return null;
  }
  if (endedAt == null || endedAt === '') {
    return 'start';
  }
  const { scheduledEnd } = onlineClassWindow(startsAt, durationMinutes ?? 60);
  return onlineClassHasTimeLeft(scheduledEnd, now) ? 'restart' : 'ended';
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
