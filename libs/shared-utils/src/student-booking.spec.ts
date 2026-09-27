import { istSlotToUtc } from './tutor-calendar';
import {
  bookingCalendarFromDraft,
  bookingDaysWithSlots,
  formatIstBookingChipLabel,
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
  isStudentBookingDraftReady,
  lockedDeliveryMode,
  weekOffsetsWithSlots,
} from './student-booking';

describe('student booking helpers', () => {
  it('locks delivery mode when only one is enabled', () => {
    expect(lockedDeliveryMode(true, false)).toBe('offline');
    expect(lockedDeliveryMode(false, true)).toBe('online');
    expect(lockedDeliveryMode(true, true)).toBeNull();
    expect(lockedDeliveryMode(false, false)).toBeNull();
  });

  it('formats IST date and 1-hour range labels', () => {
    const startsAt = istSlotToUtc(2026, 8, 24, 17, 0);
    expect(formatIstBookingDateLabel(startsAt)).toBe('Thu 24 Sep');
    expect(formatIstBookingTimeRange(startsAt)).toBe('5:00 PM – 6:00 PM');
    expect(formatIstBookingChipLabel(startsAt)).toBe('5:00 PM');
  });

  it('requires a complete confirm draft', () => {
    expect(
      isStudentBookingDraftReady({
        tutorId: '1',
        offeringId: '30',
      }),
    ).toBe(false);
    expect(
      isStudentBookingDraftReady({
        tutorId: '1',
        offeringId: '30',
        tutorCalendarId: '9',
        deliveryMode: 'online',
        startsAt: '2026-09-24T11:30:00.000Z',
      }),
    ).toBe(true);
  });

  it('keeps only days that still have a bookable slot', () => {
    const wednesday = istSlotToUtc(2026, 8, 16, 10, 0);
    const friday = istSlotToUtc(2026, 8, 18, 17, 0);
    const days = bookingDaysWithSlots([friday], 0, wednesday);
    expect(days.map((d) => d.key)).toEqual(['2026-9-18']);
    expect(weekOffsetsWithSlots([friday], wednesday)).toEqual([0]);
  });

  it('restores the selected week and day from a confirm draft', () => {
    const startsAt = istSlotToUtc(2026, 8, 24, 17, 0);
    const now = istSlotToUtc(2026, 8, 16, 10, 0);
    expect(
      bookingCalendarFromDraft(
        {
          tutorId: '1',
          offeringId: '30',
          tutorCalendarId: '11',
          deliveryMode: 'offline',
          startsAt: startsAt.toISOString(),
        },
        now,
      ),
    ).toEqual({
      weekOffset: 1,
      selectedKey: '2026-9-24',
      selectedSlotId: '11',
      deliveryMode: 'offline',
    });
  });
});
