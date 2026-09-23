import {
  EDUCATIONAL_QUALIFICATION_LIST,
  EducationalQualification,
} from './education-qualification.enum';
import {
  DIVISION_GRADE_VALUES,
  GradeType,
  type DivisionGradeValue,
} from './grade-type.enum';

export type QualificationFormRow = {
  qualificationType: EducationalQualification;
  boardOrUniversity: string;
  gradeType: GradeType;
  gradeValue: string;
  yearObtained: string;
  fieldOfStudy: string;
  degreeName: string;
};

export type QualificationRowFieldErrors = Partial<Record<keyof QualificationFormRow, string>>;

export function mapQualificationToFormRow(qual: {
  qualificationType: string;
  boardOrUniversity: string;
  gradeType: string;
  gradeValue: string;
  yearObtained: number;
  fieldOfStudy?: string | null;
  degreeName?: string | null;
}): QualificationFormRow {
  const qualificationType = qual.qualificationType as EducationalQualification;
  return {
    qualificationType,
    boardOrUniversity: qual.boardOrUniversity ?? '',
    gradeType: qual.gradeType as GradeType,
    gradeValue:
      (qual.gradeType as GradeType) === GradeType.DIVISION
        ? normalizeDivisionGradeValue(String(qual.gradeValue ?? ''))
        : String(qual.gradeValue ?? ''),
    yearObtained: qual.yearObtained != null ? String(qual.yearObtained) : '',
    fieldOfStudy: qual.fieldOfStudy ?? '',
    degreeName:
      qual.degreeName ??
      (qualificationType === EducationalQualification.HIGHER_SECONDARY
        ? 'Higher Secondary'
        : ''),
  };
}

export function emptyQualificationRow(
  type: EducationalQualification,
): QualificationFormRow {
  return {
    qualificationType: type,
    boardOrUniversity: '',
    gradeType: GradeType.PERCENTAGE,
    gradeValue: '',
    yearObtained: '',
    fieldOfStudy: '',
    degreeName:
      type === EducationalQualification.HIGHER_SECONDARY ? 'Higher Secondary' : '',
  };
}

export function getAvailableQualificationTypes(
  existingTypes: EducationalQualification[],
): EducationalQualification[] {
  const used = new Set(existingTypes);
  return EDUCATIONAL_QUALIFICATION_LIST.filter(
    (t) => t !== EducationalQualification.HIGHER_SECONDARY && !used.has(t),
  );
}

export function getQualificationDegreeLabel(type: EducationalQualification): string {
  if (type === EducationalQualification.DIPLOMA) return 'Diploma Name';
  if (type === EducationalQualification.PG_DIPLOMA) return 'PG Diploma Name';
  return 'Degree name';
}

export function getQualificationDegreePlaceholder(type: EducationalQualification): string {
  switch (type) {
    case EducationalQualification.HIGHER_SECONDARY:
      return 'Higher Secondary';
    case EducationalQualification.DIPLOMA:
      return 'e.g. A level Diploma in French';
    case EducationalQualification.PG_DIPLOMA:
      return 'e.g. PG Diploma in German';
    case EducationalQualification.BACHELORS:
      return 'e.g. BA, BSc, BCom, BTech';
    case EducationalQualification.MASTERS:
      return 'e.g. MA, MSc, MCom';
    case EducationalQualification.MPHIL:
    case EducationalQualification.PHD:
      return 'e.g. MPhil, PhD';
    default:
      return 'e.g. BA, BSc, MSc';
  }
}

export function getQualificationFieldOfStudyPlaceholder(
  type: EducationalQualification,
): string {
  if (
    type === EducationalQualification.DIPLOMA ||
    type === EducationalQualification.PG_DIPLOMA
  ) {
    return 'e.g. French, German, Spanish';
  }
  return 'e.g. Science, Commerce, Computer';
}

export function getQualificationGradeValuePlaceholder(gradeType: GradeType): string {
  if (gradeType === GradeType.CGPA) return 'e.g. 8.5';
  if (gradeType === GradeType.PERCENTAGE) return 'e.g. 85';
  return '';
}

/** Maps stored/API division text to I, II, or III when possible. */
export function normalizeDivisionGradeValue(value: string): DivisionGradeValue | '' {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  if (upper === 'I' || upper === '1') return 'I';
  if (upper === 'II' || upper === '2') return 'II';
  if (upper === 'III' || upper === '3') return 'III';
  if (/first/i.test(trimmed)) return 'I';
  if (/second/i.test(trimmed)) return 'II';
  if (/third/i.test(trimmed)) return 'III';
  if (DIVISION_GRADE_VALUES.includes(upper as DivisionGradeValue)) {
    return upper as DivisionGradeValue;
  }
  return '';
}

export function isValidDivisionGradeValue(value: string): value is DivisionGradeValue {
  return DIVISION_GRADE_VALUES.includes(value as DivisionGradeValue);
}

/** Updates grade value when the user changes grade type. */
export function patchQualificationRowForGradeTypeChange(
  row: QualificationFormRow,
  gradeType: GradeType,
): Partial<QualificationFormRow> {
  if (gradeType === GradeType.DIVISION) {
    return {
      gradeType,
      gradeValue: normalizeDivisionGradeValue(row.gradeValue),
    };
  }
  if (
    row.gradeType === GradeType.DIVISION &&
    isValidDivisionGradeValue(row.gradeValue)
  ) {
    return { gradeType, gradeValue: '' };
  }
  return { gradeType };
}

export function validateQualificationRow(
  row: QualificationFormRow,
  now = new Date(),
): { ok: true; normalized: QualificationFormRow } | { ok: false; fieldErrors: QualificationRowFieldErrors } {
  const fieldErrors: QualificationRowFieldErrors = {};
  const currentYear = now.getFullYear();

  if (!row.boardOrUniversity.trim()) fieldErrors.boardOrUniversity = 'Required';
  if (row.gradeType === GradeType.DIVISION) {
    const division = normalizeDivisionGradeValue(row.gradeValue);
    if (!isValidDivisionGradeValue(division)) {
      fieldErrors.gradeValue = 'Select a division';
    }
  } else if (!row.gradeValue.trim()) {
    fieldErrors.gradeValue = 'Required';
  }
  if (!row.fieldOfStudy.trim()) fieldErrors.fieldOfStudy = 'Required';

  const year = parseInt(row.yearObtained, 10);
  if (!row.yearObtained.trim()) {
    fieldErrors.yearObtained = 'Required';
  } else if (Number.isNaN(year) || year < 1950 || year > currentYear) {
    fieldErrors.yearObtained = `Enter a year between 1950 and ${currentYear}`;
  }

  if (row.qualificationType !== EducationalQualification.HIGHER_SECONDARY) {
    if (!row.degreeName.trim()) fieldErrors.degreeName = 'Required';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const gradeValue =
    row.gradeType === GradeType.DIVISION
      ? normalizeDivisionGradeValue(row.gradeValue)
      : row.gradeValue.trim();

  return {
    ok: true,
    normalized: {
      ...row,
      boardOrUniversity: row.boardOrUniversity.trim(),
      gradeValue,
      fieldOfStudy: row.fieldOfStudy.trim(),
      yearObtained: row.yearObtained.trim(),
      degreeName:
        row.qualificationType === EducationalQualification.HIGHER_SECONDARY
          ? 'Higher Secondary'
          : row.degreeName.trim(),
    },
  };
}

export function validateQualificationList(
  rows: QualificationFormRow[],
): { ok: true } | { ok: false; message: string } {
  const hasHigherSecondary = rows.some(
    (q) => q.qualificationType === EducationalQualification.HIGHER_SECONDARY,
  );
  if (!hasHigherSecondary) {
    return { ok: false, message: 'At least one qualification must be Higher Secondary.' };
  }
  return { ok: true };
}

export function buildQualificationMutationInput(rows: QualificationFormRow[]) {
  return rows.map((row, index) => ({
    qualificationType: row.qualificationType,
    boardOrUniversity: row.boardOrUniversity.trim(),
    gradeType: row.gradeType,
    gradeValue: row.gradeValue.trim(),
    yearObtained: parseInt(row.yearObtained, 10),
    fieldOfStudy: row.fieldOfStudy.trim() || undefined,
    degreeName:
      row.qualificationType === EducationalQualification.HIGHER_SECONDARY
        ? 'Higher Secondary'
        : row.degreeName.trim() || undefined,
    displayOrder: index,
  }));
}

export function canDeleteQualificationType(type: EducationalQualification): boolean {
  return type !== EducationalQualification.HIGHER_SECONDARY;
}
