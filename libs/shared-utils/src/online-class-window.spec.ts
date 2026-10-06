import {
  canJoinOnlineClass,
  onlineClassChannelName,
  onlineClassWindow,
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
});
