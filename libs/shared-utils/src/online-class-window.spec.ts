import {
  canJoinOnlineClass,
  fitWhiteboardStage,
  isOnlineClassEndedError,
  nameInitials,
  onlineClassChannelName,
  onlineClassHasTimeLeft,
  onlineClassScreenSharePayload,
  onlineClassScreenShareState,
  onlineClassWindow,
  tutorOnlineClassAction,
} from './online-class-window';

/** 3:00 pm IST on 4 Oct 2026. */
const START = new Date('2026-10-04T09:30:00.000Z');

describe('onlineClassWindow', () => {
  const window = onlineClassWindow(START, 60);

  it('opens a 3:00 pm class at 2:55 and closes it at 4:05', () => {
    expect(window.opensAt.toISOString()).toBe('2026-10-04T09:25:00.000Z');
    expect(window.warnAt.toISOString()).toBe('2026-10-04T10:25:00.000Z');
    expect(window.scheduledEnd.toISOString()).toBe('2026-10-04T10:30:00.000Z');
    expect(window.hardEnd.toISOString()).toBe('2026-10-04T10:35:00.000Z');
  });

  it('allows join at 2:55 pm and 4:04 pm, and rejects 2:54 pm and 4:05 pm', () => {
    expect(canJoinOnlineClass(START, 60, new Date('2026-10-04T09:25:00.000Z'))).toBe(true);
    expect(canJoinOnlineClass(START, 60, new Date('2026-10-04T10:34:00.000Z'))).toBe(true);
    expect(canJoinOnlineClass(START, 60, new Date('2026-10-04T09:24:00.000Z'))).toBe(false);
    expect(canJoinOnlineClass(START, 60, new Date('2026-10-04T10:35:00.000Z'))).toBe(false);
  });

  it('names the channel from the session id', () => {
    expect(onlineClassChannelName(42)).toBe('class-42');
  });

  it('has time left until more than 5 minutes before the 4:00 pm scheduled end', () => {
    expect(onlineClassHasTimeLeft(window.scheduledEnd, new Date('2026-10-04T10:24:59.000Z'))).toBe(true);
    expect(onlineClassHasTimeLeft(window.scheduledEnd, new Date('2026-10-04T10:25:00.000Z'))).toBe(false);
    expect(onlineClassHasTimeLeft(null)).toBe(false);
  });

  it('offers the tutor start, restart, or an ended note', () => {
    const at = (iso: string) => new Date(iso);
    expect(tutorOnlineClassAction(START, 60, null, at('2026-10-04T09:24:00.000Z'))).toBeNull();
    expect(tutorOnlineClassAction(START, 60, null, at('2026-10-04T09:25:00.000Z'))).toBe('start');
    expect(tutorOnlineClassAction(START, 60, '2026-10-04T09:40:00.000Z', at('2026-10-04T10:24:00.000Z'))).toBe('restart');
    expect(tutorOnlineClassAction(START, 60, '2026-10-04T09:40:00.000Z', at('2026-10-04T10:25:00.000Z'))).toBe('ended');
    expect(tutorOnlineClassAction(START, 60, '2026-10-04T09:40:00.000Z', at('2026-10-04T10:35:00.000Z'))).toBeNull();
  });

  it('recognises the class-ended error', () => {
    expect(isOnlineClassEndedError(new Error('This class has ended'))).toBe(true);
    expect(isOnlineClassEndedError(new Error('This class is not open yet'))).toBe(false);
  });
});

describe('fitWhiteboardStage', () => {
  it('fills a tall board by width and a wide board by height', () => {
    expect(fitWhiteboardStage(300, 600)).toEqual({ width: 300, height: 450 });
    expect(fitWhiteboardStage(600, 300)).toEqual({ width: 200, height: 300 });
    expect(fitWhiteboardStage(0, 300)).toEqual({ width: 0, height: 0 });
  });
});

describe('onlineClassScreenShareState', () => {
  it('reads a screen-share signal and ignores chat', () => {
    expect(onlineClassScreenShareState(onlineClassScreenSharePayload(true))).toBe(true);
    expect(onlineClassScreenShareState(onlineClassScreenSharePayload(false))).toBe(false);
    expect(onlineClassScreenShareState(JSON.stringify({ text: 'hello' }))).toBeNull();
  });
});

describe('nameInitials', () => {
  it('uses the first and last name initials', () => {
    expect(nameInitials('Ada Lovelace')).toBe('AL');
    expect(nameInitials('Mary Ann Smith')).toBe('MS');
    expect(nameInitials('Priya')).toBe('P');
    expect(nameInitials('  ')).toBe('');
  });
});
