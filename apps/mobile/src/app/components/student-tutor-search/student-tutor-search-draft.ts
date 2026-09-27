export type StudentTutorSearchDraft = {
  studyArea: string;
  selectedIds: number[];
  deliveryMode: 'ANY' | 'ONLINE' | 'OFFLINE';
  classFormat: 'ANY' | 'INDIVIDUAL' | 'GROUP';
  maxRateText: string;
  radiusKm: number;
};

let draft: StudentTutorSearchDraft | null = null;

export function readStudentTutorSearchDraft(): StudentTutorSearchDraft | null {
  return draft;
}

export function writeStudentTutorSearchDraft(next: StudentTutorSearchDraft): void {
  draft = next;
}

export function clearStudentTutorSearchDraft(): void {
  draft = null;
}
