/**
 * Questions that contain <img> tags reference figures stored in legacy file storage
 * that could not be backed up. We exclude them when serving the proficiency test
 * so only text-only questions are shown (data is still migrated 100%).
 */
const IMAGE_TAG_PATTERN = /<img\s/i;

/**
 * Returns true if the question text contains an image tag (e.g. <img src="...">).
 * Used to exclude such questions when serving the proficiency test.
 */
export function questionContainsImage(questionText: string): boolean {
  if (!questionText || typeof questionText !== 'string') return false;
  return IMAGE_TAG_PATTERN.test(questionText);
}

/**
 * Filters an array of items that have a `question` string property,
 * returning only those whose question text does not contain images.
 */
export function filterQuestionsWithoutImages<T extends { question: string }>(
  questions: T[]
): T[] {
  if (!Array.isArray(questions)) return [];
  return questions.filter((q) => !questionContainsImage(q.question));
}
