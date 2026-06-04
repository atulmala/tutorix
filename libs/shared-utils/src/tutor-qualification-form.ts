import {
  EDUCATIONAL_QUALIFICATION_LIST,
  EducationalQualification,
} from './education-qualification.enum';
import { GradeType } from './grade-type.enum';

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
    gradeValue: String(qual.gradeValue ?? ''),
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
  return 'e.g. First Division';
}

export function validateQualificationRow(
  row: QualificationFormRow,
  now = new Date(),
): { ok: true; normalized: QualificationFormRow } | { ok: false; fieldErrors: QualificationRowFieldErrors } {
  const fieldErrors: QualificationRowFieldErrors = {};
  const currentYear = now.getFullYear();

  if (!row.boardOrUniversity.trim()) fieldErrors.boardOrUniversity = 'Required';
  if (!row.gradeValue.trim()) fieldErrors.gradeValue = 'Required';
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

  return {
    ok: true,
    normalized: {
      ...row,
      boardOrUniversity: row.boardOrUniversity.trim(),
      gradeValue: row.gradeValue.trim(),
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
