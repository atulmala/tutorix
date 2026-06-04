import { EmploymentType } from './employment-type.enum';
import { YearsOfExperienceEnum } from './years-of-experience.enum';

export type ExperienceFormRow = {
  id?: number;
  jobTitle: string;
  employerName: string;
  employerAddress: string;
  employmentType: EmploymentType;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

export type ExperienceRowFieldErrors = Partial<Record<keyof ExperienceFormRow, string>>;

const EMPLOYMENT_TYPE_BY_NUM: Record<number, EmploymentType> = {
  1: EmploymentType.FULL_TIME,
  2: EmploymentType.PART_TIME,
  3: EmploymentType.SELF_EMPLOYED,
  4: EmploymentType.FREELANCE,
  5: EmploymentType.INTERNSHIP,
  6: EmploymentType.TRAINEE,
};

export function mapEmploymentType(
  v: string | number | null | undefined,
): EmploymentType {
  if (v == null) return EmploymentType.FULL_TIME;
  if (typeof v === 'number') {
    return EMPLOYMENT_TYPE_BY_NUM[v] ?? EmploymentType.FULL_TIME;
  }
  const found = Object.values(EmploymentType).find((x) => x === v);
  return found ?? EmploymentType.FULL_TIME;
}

export function emptyExperienceRow(): ExperienceFormRow {
  return {
    jobTitle: '',
    employerName: '',
    employerAddress: '',
    employmentType: EmploymentType.FULL_TIME,
    startDate: '',
    endDate: '',
    isCurrent: false,
  };
}

export function mapExperienceToFormRow(exp: {
  id?: number;
  jobTitle: string;
  employerName?: string | null;
  employerAddress?: string | null;
  employmentType: string | number;
  startDate: string;
  endDate?: string | null;
  isCurrent?: boolean;
}): ExperienceFormRow {
  return {
    id: exp.id,
    jobTitle: exp.jobTitle ?? '',
    employerName: exp.employerName ?? '',
    employerAddress: exp.employerAddress ?? '',
    employmentType: mapEmploymentType(exp.employmentType),
    startDate: exp.startDate ? exp.startDate.slice(0, 10) : '',
    endDate: exp.endDate ? exp.endDate.slice(0, 10) : '',
    isCurrent: exp.isCurrent ?? false,
  };
}

export function validateExperienceRow(
  row: ExperienceFormRow,
  now = new Date(),
): { ok: true; normalized: ExperienceFormRow } | { ok: false; fieldErrors: ExperienceRowFieldErrors } {
  const fieldErrors: ExperienceRowFieldErrors = {};
  const currentYear = now.getFullYear();

  if (!row.jobTitle.trim()) {
    fieldErrors.jobTitle = 'Required';
  }
  if (row.employmentType !== EmploymentType.SELF_EMPLOYED) {
    if (!row.employerName.trim()) fieldErrors.employerName = 'Required';
    if (!row.employerAddress.trim()) fieldErrors.employerAddress = 'Required';
  }
  if (!row.startDate.trim()) {
    fieldErrors.startDate = 'Required';
  } else {
    const start = new Date(row.startDate);
    if (Number.isNaN(start.getTime())) {
      fieldErrors.startDate = 'Invalid date';
    } else if (start.getFullYear() < 1950 || start.getFullYear() > currentYear) {
      fieldErrors.startDate = `Year must be between 1950 and ${currentYear}`;
    }
  }
  if (!row.isCurrent && !row.endDate.trim()) {
    fieldErrors.endDate = 'Required when not currently working';
  } else if (!row.isCurrent && row.endDate.trim()) {
    const end = new Date(row.endDate);
    if (Number.isNaN(end.getTime())) {
      fieldErrors.endDate = 'Invalid date';
    } else if (row.startDate && new Date(row.startDate) > end) {
      fieldErrors.endDate = 'End date must be after start date';
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    normalized: {
      ...row,
      jobTitle: row.jobTitle.trim(),
      employerName: row.employerName.trim(),
      employerAddress: row.employerAddress.trim(),
      endDate: row.isCurrent ? '' : row.endDate.trim(),
    },
  };
}

export function buildExperienceMutationInput(rows: ExperienceFormRow[]) {
  return rows.map((row) => ({
    id: row.id,
    jobTitle: row.jobTitle.trim(),
    employerName:
      row.employmentType === EmploymentType.SELF_EMPLOYED
        ? undefined
        : row.employerName.trim() || undefined,
    employerAddress:
      row.employmentType === EmploymentType.SELF_EMPLOYED
        ? undefined
        : row.employerAddress.trim() || undefined,
    employmentType: row.employmentType,
    startDate: row.startDate,
    endDate: row.isCurrent ? undefined : row.endDate || undefined,
    isCurrent: row.isCurrent,
  }));
}

const YEARS_OF_EXPERIENCE_BY_NUM: YearsOfExperienceEnum[] = [
  YearsOfExperienceEnum.ZERO_TO_TWO,
  YearsOfExperienceEnum.TWO_TO_FIVE,
  YearsOfExperienceEnum.FIVE_TO_TEN,
  YearsOfExperienceEnum.MORE_THAN_TEN,
];

export function normalizeYearsOfExperience(
  v: string | number | null | undefined,
): YearsOfExperienceEnum {
  if (v == null) return YearsOfExperienceEnum.ZERO_TO_TWO;
  if (typeof v === 'number') {
    return YEARS_OF_EXPERIENCE_BY_NUM[(v as number) - 1] ?? YearsOfExperienceEnum.ZERO_TO_TWO;
  }
  const found = Object.values(YearsOfExperienceEnum).find((x) => x === v);
  return found ?? YearsOfExperienceEnum.ZERO_TO_TWO;
}

export const EXPERIENCE_CURRENT_DATE = new Date().toISOString().slice(0, 10);
