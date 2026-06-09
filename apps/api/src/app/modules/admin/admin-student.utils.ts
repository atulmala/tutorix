export function applyAdminStudentSearchFilter(
  qb: { andWhere: (clause: string, params: Record<string, string>) => void },
  search: string | undefined,
): void {
  const trimmed = search?.trim();
  if (!trimmed) {
    return;
  }
  const term = `%${trimmed}%`;
  qb.andWhere(
    `(user.email ILIKE :term OR user.mobile ILIKE :term OR user.mobile_number ILIKE :term OR user.firstName ILIKE :term OR user.lastName ILIKE :term OR CONCAT(COALESCE(user.firstName, ''), ' ', COALESCE(user.lastName, '')) ILIKE :term)`,
    { term },
  );
}
