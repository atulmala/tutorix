/**
 * Study areas and their dropdown levels for tutor offering creation.
 * Used by web and mobile to build the multi-step offering selection flow.
 */
export const STUDY_AREAS: Record<
  string,
  { level: number; name: string }[]
> = {
  SCHOOL_EDUCATION: [
    { level: 1, name: 'board' },
    { level: 2, name: 'grade' },
    { level: 3, name: 'subject' },
  ],
  'Competitive Exam': [
    { level: 1, name: 'category' },
    { level: 2, name: 'title' },
    { level: 3, name: 'subject' },
  ],
  'Study Abroad': [
    { level: 1, name: 'test' },
    { level: 2, name: 'subject' },
  ],
  'Language Learning': [
    { level: 1, name: 'language' },
    { level: 2, name: 'level' },
  ],
};

/** Ordered options for the Study Area dropdown (first step of offering creation) */
export const STUDY_AREAS_OPTIONS: { key: string; label: string }[] = [
  { key: 'SCHOOL_EDUCATION', label: 'School Education' },
  { key: 'Study Abroad', label: 'Study Abroad' },
  { key: 'Competitive Exam', label: 'Competitive Exam' },
  { key: 'Language Learning', label: 'Language Learning' },
];

/** Student-facing label for a cascade level (board / class / subject, etc.). */
export function cascadeFieldLabel(studyAreaKey: string, levelName: string): string {
  if (studyAreaKey === 'SCHOOL_EDUCATION') {
    if (levelName === 'board') return 'Board';
    if (levelName === 'grade') return 'Class';
    if (levelName === 'subject') return 'Subject';
  }
  if (levelName === 'title') return 'Exam';
  return levelName.charAt(0).toUpperCase() + levelName.slice(1);
}
