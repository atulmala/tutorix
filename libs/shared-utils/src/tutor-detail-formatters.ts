import {
  EDUCATIONAL_QUALIFICATION_LABELS,
  EDUCATIONAL_QUALIFICATION_LIST,
  EducationalQualification,
} from './education-qualification.enum';

export type DocumentScreeningStatus =
  | 'PASSED_AUTOMATED'
  | 'PENDING_HUMAN'
  | 'APPROVED_HUMAN'
  | 'REJECTED_HUMAN';

export function isDocumentPassed(status?: string | null): boolean {
  return status === 'PASSED_AUTOMATED' || status === 'APPROVED_HUMAN';
}

export function isDocumentRejected(status?: string | null): boolean {
  return status === 'REJECTED_HUMAN';
}

export function isDocumentPendingHuman(status?: string | null): boolean {
  return status === 'PENDING_HUMAN';
}

export function documentStatusLabel(status?: string | null): string {
  switch (status) {
    case 'PASSED_AUTOMATED':
      return 'AI passed';
    case 'PENDING_HUMAN':
      return 'Needs review';
    case 'APPROVED_HUMAN':
      return 'Approved';
    case 'REJECTED_HUMAN':
      return 'Rejected';
    default:
      return 'Awaiting AI';
  }
}

export function documentStatusBadgeClass(status?: string | null): string {
  if (isDocumentPassed(status)) {
    return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';
  }
  if (isDocumentRejected(status)) {
    return 'bg-rose-100 text-rose-800 ring-1 ring-rose-200';
  }
  if (isDocumentPendingHuman(status)) {
    return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  }
  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
}

export function ptStatusLabel(status: string): string {
  switch (status) {
    case 'pt_passed':
      return 'Passed';
    case 'pt_failed':
      return 'Failed';
    default:
      return 'Pending';
  }
}

export function ptStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pt_passed':
      return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';
    case 'pt_failed':
      return 'bg-rose-100 text-rose-800 ring-1 ring-rose-200';
    default:
      return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  }
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export type ExperienceDuration = {
  years: number;
  months: number;
};

export type ExperienceDateRange = {
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
};

export function monthsBetweenDates(start: Date, end: Date): number {
  if (end < start) return 0;

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  if (end.getDate() < start.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

export function monthsToExperienceDuration(totalMonths: number): ExperienceDuration {
  const normalized = Math.max(0, totalMonths);
  return {
    years: Math.floor(normalized / 12),
    months: normalized % 12,
  };
}

export function formatExperienceDuration(
  duration: ExperienceDuration,
): string {
  const { years, months } = duration;

  if (years === 0 && months === 0) {
    return '0 months';
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} year${years === 1 ? '' : 's'}`);
  }
  if (months > 0) {
    parts.push(`${months} month${months === 1 ? '' : 's'}`);
  }
  return parts.join(' ');
}

export function formatQualificationTitle(
  qualificationType: string,
  degreeName?: string | null,
): string {
  const type = qualificationType as EducationalQualification;
  const label =
    EDUCATIONAL_QUALIFICATION_LABELS[type] ??
    qualificationType.replace(/_/g, ' ');

  if (type === EducationalQualification.HIGHER_SECONDARY) {
    return label;
  }

  const degree = degreeName?.trim();
  if (degree) {
    return `${label} · ${degree}`;
  }

  return label;
}

const QUALIFICATION_LEVEL_RANK = Object.fromEntries(
  EDUCATIONAL_QUALIFICATION_LIST.map((type, index) => [type, index]),
) as Record<string, number>;

function qualificationLevelRank(qualificationType: string): number {
  return QUALIFICATION_LEVEL_RANK[qualificationType] ?? -1;
}

export type QualificationSummary = {
  qualificationType: string;
  yearObtained?: number;
};

/** Sort qualifications with highest level first (PhD → Higher Secondary). */
export function sortQualificationsHighestFirst<T extends QualificationSummary>(
  qualifications: T[],
): T[] {
  return [...qualifications].sort((a, b) => {
    const levelDiff =
      qualificationLevelRank(b.qualificationType) -
      qualificationLevelRank(a.qualificationType);
    if (levelDiff !== 0) return levelDiff;
    return (b.yearObtained ?? 0) - (a.yearObtained ?? 0);
  });
}

export function experienceDurationMonths(
  experience: ExperienceDateRange,
  now: Date = new Date(),
): number | null {
  if (!experience.startDate) return null;

  const start = new Date(experience.startDate);
  if (Number.isNaN(start.getTime())) return null;

  const end = experience.isCurrent
    ? now
    : experience.endDate
      ? new Date(experience.endDate)
      : null;

  if (!end || Number.isNaN(end.getTime())) return null;

  return monthsBetweenDates(start, end);
}

export function sumExperienceDurations(
  experiences: ExperienceDateRange[],
  now: Date = new Date(),
): ExperienceDuration {
  let totalMonths = 0;

  for (const experience of experiences) {
    const months = experienceDurationMonths(experience, now);
    if (months != null) {
      totalMonths += months;
    }
  }

  return monthsToExperienceDuration(totalMonths);
}
