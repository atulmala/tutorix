/** A student cannot hold two confirmed classes whose times overlap. */
export const STUDENT_SLOT_CONFLICT_MESSAGE = 'You already have a class at this time';

export function classWindowsOverlap(
  aStart: Date,
  aMinutes: number,
  bStart: Date,
  bMinutes: number,
): boolean {
  const aEnd = aStart.getTime() + aMinutes * 60_000;
  const bEnd = bStart.getTime() + bMinutes * 60_000;
  return aStart.getTime() < bEnd && bStart.getTime() < aEnd;
}
