const MS_PER_DAY = 86_400_000;

export function computeDaysInStage(
  enteredAt: Date | null | undefined,
  now: Date = new Date(),
): number {
  if (!enteredAt) {
    return 0;
  }
  const ms = now.getTime() - new Date(enteredAt).getTime();
  return Math.max(0, Math.floor(ms / MS_PER_DAY));
}

export function applyAdminTutorSearchFilter(
  qb: { andWhere: (clause: string, params: Record<string, string>) => void },
  search: string | undefined,
): void {
  const trimmed = search?.trim();
  if (!trimmed) {
    return;
  }
  const term = `%${trimmed}%`;
  qb.andWhere(
    `(user.email ILIKE :term OR user.mobile ILIKE :term OR user.mobile_number ILIKE :term OR user.first_name ILIKE :term OR user.last_name ILIKE :term OR CONCAT(COALESCE(user.first_name, ''), ' ', COALESCE(user.last_name, '')) ILIKE :term)`,
    { term },
  );
}
