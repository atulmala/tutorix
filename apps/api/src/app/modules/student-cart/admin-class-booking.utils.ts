type SearchQb = {
  andWhere: (clause: string, params: Record<string, string>) => void;
};

function userSearchClause(userAlias: string, paramKey: string): string {
  return `(
    ${userAlias}.email ILIKE :${paramKey}
    OR ${userAlias}.mobile ILIKE :${paramKey}
    OR ${userAlias}.mobile_number ILIKE :${paramKey}
    OR ${userAlias}.firstName ILIKE :${paramKey}
    OR ${userAlias}.lastName ILIKE :${paramKey}
    OR CONCAT(COALESCE(${userAlias}.firstName, ''), ' ', COALESCE(${userAlias}.lastName, '')) ILIKE :${paramKey}
  )`;
}

export function applyAdminClassBookingStudentSearch(
  qb: SearchQb,
  search: string | undefined,
  userAlias = 'studentUser',
): void {
  const trimmed = search?.trim();
  if (!trimmed) {
    return;
  }
  qb.andWhere(userSearchClause(userAlias, 'studentSearchTerm'), {
    studentSearchTerm: `%${trimmed}%`,
  });
}

export function applyAdminClassBookingTutorSearch(
  qb: SearchQb,
  search: string | undefined,
  userAlias = 'tutorUser',
): void {
  const trimmed = search?.trim();
  if (!trimmed) {
    return;
  }
  qb.andWhere(userSearchClause(userAlias, 'tutorSearchTerm'), {
    tutorSearchTerm: `%${trimmed}%`,
  });
}

export function personDisplayName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}
