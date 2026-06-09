const ROMAN_BY_CLASS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
  11: 'XI',
  12: 'XII',
};

export function formatSchoolClassRoman(classNum: number): string {
  return ROMAN_BY_CLASS[classNum] ?? String(classNum);
}

export const SCHOOL_CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const value = i + 1;
  return { value, label: formatSchoolClassRoman(value) };
});
