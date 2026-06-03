/**
 * Booking capacity (future booking service):
 * - base rate on rate card is per student per class; batch_size caps enrollments per 1-hour slot.
 * - On session create: snapshot batch_size from rate card via getBatchSizeForMode(rateCard, deliveryMode).
 * - Allow enrollment while activeEnrollments < session.batch_size; reject if mode not enabled on rate card.
 * - Mark session full when activeEnrollments >= session.batch_size.
 */

export const CLASS_SESSION_CAPACITY_RULE =
  'activeEnrollments < session.batch_size';
