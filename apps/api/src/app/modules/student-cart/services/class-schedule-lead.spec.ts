import {
  bookingHorizonRange,
  canScheduleClassAt,
  classScheduleLeadMinutes,
  earliestClassStart,
} from '@tutorix/shared-utils';

describe('class schedule lead override', () => {
  const previous = process.env.CLASS_SCHEDULE_LEAD_MINUTES;

  afterEach(() => {
    if (previous == null) {
      delete process.env.CLASS_SCHEDULE_LEAD_MINUTES;
    } else {
      process.env.CLASS_SCHEDULE_LEAD_MINUTES = previous;
    }
  });

  it('keeps the 2 hour lead when the env var is unset', () => {
    delete process.env.CLASS_SCHEDULE_LEAD_MINUTES;
    const now = new Date('2026-10-01T10:30:00.000Z');
    expect(classScheduleLeadMinutes()).toBe(120);
    expect(canScheduleClassAt(new Date('2026-10-01T12:30:00.000Z'), now)).toBe(true);
    expect(canScheduleClassAt(new Date('2026-10-01T12:29:00.000Z'), now)).toBe(false);
  });

  it('asks for slots from now so the API can apply a shorter local lead', () => {
    delete process.env.CLASS_SCHEDULE_LEAD_MINUTES;
    const now = new Date('2026-10-01T10:30:00.000Z');
    expect(bookingHorizonRange(now).from.toISOString()).toBe(now.toISOString());
    expect(earliestClassStart(now).toISOString()).toBe('2026-10-01T12:30:00.000Z');
  });

  it('allows an immediate start when CLASS_SCHEDULE_LEAD_MINUTES is 0', () => {
    process.env.CLASS_SCHEDULE_LEAD_MINUTES = '0';
    const now = new Date('2026-10-01T10:30:00.000Z');
    expect(classScheduleLeadMinutes()).toBe(0);
    expect(canScheduleClassAt(now, now)).toBe(true);
    expect(canScheduleClassAt(new Date('2026-10-01T10:29:00.000Z'), now)).toBe(false);
  });
});
