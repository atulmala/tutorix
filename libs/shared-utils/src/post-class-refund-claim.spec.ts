import {
  canSubmitPostClassRefundClaim,
  postClassRefundClaimDeadlineUtc,
} from './post-class-refund-claim';
import { istSlotToUtc } from './tutor-calendar';

describe('postClassRefundClaimDeadlineUtc', () => {
  it('allows claims until end of the calendar day after class end (IST)', () => {
    const startsAt = istSlotToUtc(2026, 8, 27, 16, 0);
    const deadline = postClassRefundClaimDeadlineUtc(startsAt, 60);
    expect(deadline).not.toBeNull();
    const wedEnd = istSlotToUtc(2026, 8, 28, 23, 59);
    expect(canSubmitPostClassRefundClaim(startsAt, 60, wedEnd)).toBe(true);
    const thuStart = istSlotToUtc(2026, 8, 29, 0, 0);
    expect(canSubmitPostClassRefundClaim(startsAt, 60, thuStart)).toBe(false);
  });
});
