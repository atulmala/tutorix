/**
 * Full tutor offering labels for profile/detail views.
 */

export type OfferingNodeForLabel = {
  id: number;
  displayName: string;
  level: number;
  mediumOfInstruction?: number | null;
  parentOffering?: { id: number } | null;
  parentOfferingId?: number;
  rootOffering?: { id: number; displayName: string } | null;
  rootOfferingId?: number;
};

export type TutorOfferingLabelOptions = {
  /** Leaf offering IDs linked to the tutor's proficiency test (same PT → class range). */
  proficiencyTestOfferingIds?: number[];
};

const SCHOOL_EDUCATION_ROOT = 'School Education';

const MEDIUM_LABELS: Record<number, string> = {
  1: 'English',
  2: 'Hindi',
  3: 'Others',
};

export const OFFERING_LABEL_SEGMENT_SEPARATOR = ' | ';

function joinLabelSegments(...segments: Array<string | null | undefined>): string {
  return segments
    .filter((s): s is string => Boolean(s?.trim()))
    .join(OFFERING_LABEL_SEGMENT_SEPARATOR);
}

function normalizeClassSegment(segment: string): string {
  const range = segment.trim().match(/^classes?\s+(\d+)\s*-\s*(\d+)$/i);
  if (range) {
    return `Classes ${range[1]} - ${range[2]}`;
  }
  const single = segment.trim().match(/^classes?\s+(\d+)$/i);
  if (single) {
    return `Classes ${single[1]}`;
  }
  return segment.trim();
}

/**
 * Split an offering label into display segments (board, medium, classes, etc.).
 * Handles pipe-separated labels and legacy space-separated school education labels.
 */
export function parseTutorOfferingLabelSegments(label: string): string[] {
  const trimmed = label.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.includes(OFFERING_LABEL_SEGMENT_SEPARATOR)) {
    return trimmed
      .split(OFFERING_LABEL_SEGMENT_SEPARATOR)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const schoolMatch = trimmed.match(/^(.+?)\s+(English|Hindi|Others)\s+(.+)$/i);
  if (schoolMatch) {
    return [
      schoolMatch[1].trim(),
      schoolMatch[2].trim(),
      normalizeClassSegment(schoolMatch[3]),
    ];
  }

  return [trimmed];
}

/** Normalize any offering label string to pipe-separated form for display. */
export function formatOfferingLabelForDisplay(label: string | null | undefined): string {
  if (!label?.trim()) {
    return '—';
  }
  const segments = parseTutorOfferingLabelSegments(label);
  return segments.length > 0 ? joinLabelSegments(...segments) : label.trim();
}

function getParentId(offering: OfferingNodeForLabel): number | undefined {
  return offering.parentOffering?.id ?? offering.parentOfferingId;
}

export function getOfferingAncestors(
  leaf: OfferingNodeForLabel,
  offeringsById: Map<number, OfferingNodeForLabel>,
): OfferingNodeForLabel[] {
  const ancestors: OfferingNodeForLabel[] = [];
  let current: OfferingNodeForLabel | undefined = leaf;

  while (true) {
    const parentId = current ? getParentId(current) : undefined;
    if (parentId == null) break;

    const parent = offeringsById.get(parentId);
    if (!parent) break;

    ancestors.unshift(parent);
    current = parent;
  }

  return ancestors;
}

function mediumLabel(medium?: number | null): string {
  if (medium == null) return MEDIUM_LABELS[1];
  return MEDIUM_LABELS[medium] ?? MEDIUM_LABELS[1];
}

/** Extract class number from labels like "Class 4", "class 11". */
export function parseClassNumber(displayName: string): number | null {
  const match = displayName.trim().match(/^class\s+(\d+)$/i);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
}

function schoolEducationGroupKey(
  leaf: OfferingNodeForLabel,
  ancestors: OfferingNodeForLabel[],
): string | null {
  const boardId = ancestors[1]?.id;
  if (boardId == null) return null;
  const medium = leaf.mediumOfInstruction ?? 1;
  return `${boardId}:${medium}:${leaf.displayName}`;
}

function collectClassNumbersForGroup(
  offeringIds: number[],
  offeringsById: Map<number, OfferingNodeForLabel>,
  groupKey: string,
): number[] {
  const numbers: number[] = [];

  for (const offeringId of offeringIds) {
    const candidate = offeringsById.get(offeringId);
    if (!candidate) continue;

    const ancestors = getOfferingAncestors(candidate, offeringsById);
    if (ancestors[0]?.displayName !== SCHOOL_EDUCATION_ROOT) continue;
    if (schoolEducationGroupKey(candidate, ancestors) !== groupKey) continue;

    const grade = ancestors[2]?.displayName;
    if (!grade) continue;

    const classNum = parseClassNumber(grade);
    if (classNum != null) {
      numbers.push(classNum);
    }
  }

  return numbers;
}

function formatClassRangeLabel(classNumbers: number[]): string | null {
  if (classNumbers.length === 0) return null;

  const sorted = [...new Set(classNumbers)].sort((a, b) => a - b);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];

  if (low === high) {
    return `Classes ${low}`;
  }

  return `Classes ${low} - ${high}`;
}

function formatNonSchoolEducationLabel(
  leaf: OfferingNodeForLabel,
  ancestors: OfferingNodeForLabel[],
): string {
  const segments = [...ancestors.slice(1).map((a) => a.displayName), leaf.displayName];
  return joinLabelSegments(...segments) || leaf.displayName;
}

/**
 * Build a full offering label for tutor profile tables.
 * School Education: "{board} | {medium} | {subject} | Classes {low} - {high}" from PT-linked offerings when available.
 * Other study areas: space-separated path without the root study area name.
 */
export function formatTutorOfferingFullLabel(
  leaf: OfferingNodeForLabel | null | undefined,
  offeringsById: Map<number, OfferingNodeForLabel>,
  options?: TutorOfferingLabelOptions,
): string {
  if (!leaf) return '—';

  const resolvedLeaf = offeringsById.get(leaf.id) ?? leaf;
  const ancestors = getOfferingAncestors(resolvedLeaf, offeringsById);
  const root =
    ancestors.length > 0
      ? ancestors[0]
      : resolvedLeaf.rootOffering
        ? {
            id: resolvedLeaf.rootOffering.id,
            displayName: resolvedLeaf.rootOffering.displayName,
            level: 0,
          }
        : resolvedLeaf;

  if (root.displayName === SCHOOL_EDUCATION_ROOT) {
    return formatSchoolEducationLabelWithCatalog(
      resolvedLeaf,
      ancestors,
      offeringsById,
      options,
    );
  }

  return formatNonSchoolEducationLabel(resolvedLeaf, ancestors);
}

function formatSchoolEducationLabelWithCatalog(
  leaf: OfferingNodeForLabel,
  ancestors: OfferingNodeForLabel[],
  offeringsById: Map<number, OfferingNodeForLabel>,
  options?: TutorOfferingLabelOptions,
): string {
  const medium = mediumLabel(leaf.mediumOfInstruction);
  const board = ancestors[1]?.displayName;
  const grade = ancestors[2]?.displayName;

  if (!board) {
    return leaf.displayName;
  }

  if (!grade) {
    return joinLabelSegments(board, medium, leaf.displayName);
  }

  const groupKey = schoolEducationGroupKey(leaf, ancestors);
  const ptOfferingIds = options?.proficiencyTestOfferingIds;

  if (groupKey && ptOfferingIds?.length) {
    const classNumbers = collectClassNumbersForGroup(
      ptOfferingIds,
      offeringsById,
      groupKey,
    );
    const rangeLabel = formatClassRangeLabel(classNumbers);
    if (rangeLabel) {
      return joinLabelSegments(board, medium, leaf.displayName, rangeLabel);
    }
  }

  const classNum = parseClassNumber(grade);
  if (classNum != null) {
    return joinLabelSegments(
      board,
      medium,
      leaf.displayName,
      `Classes ${classNum}`,
    );
  }

  return joinLabelSegments(board, medium, leaf.displayName, grade);
}
