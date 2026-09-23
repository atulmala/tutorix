import { parseClassNumber, type OfferingNodeForLabel } from './tutor-offering-display';

const SCHOOL_EDUCATION_ROOT = 'School Education';

export type StudentEducationOfferingPath = {
  studyAreaKey: 'SCHOOL_EDUCATION';
  rootOfferingId: number;
  boardOfferingId?: number;
  classOfferingId?: number;
};

function normalizeBoardLabel(board?: string | null, boardOther?: string | null): string | null {
  if (!board) {
    return null;
  }
  const upper = board.trim().toUpperCase();
  if (upper === 'OTHER') {
    return boardOther?.trim() || null;
  }
  return board.trim();
}

export function mapStudentEducationToOfferingPath(
  board: string | null | undefined,
  schoolClass: number | null | undefined,
  offerings: OfferingNodeForLabel[],
  boardOther?: string | null,
): StudentEducationOfferingPath | null {
  const root = offerings.find(
    (o) => o.level === 0 && o.displayName === SCHOOL_EDUCATION_ROOT,
  );
  if (!root) {
    return null;
  }

  const boardLabel = normalizeBoardLabel(board, boardOther);
  const boardNode = boardLabel
    ? offerings.find((o) => {
        const underRoot =
          o.rootOffering?.id === root.id ||
          o.rootOfferingId === root.id ||
          o.parentOffering?.id === root.id ||
          o.parentOfferingId === root.id;
        return (
          o.level === 1 &&
          underRoot &&
          o.displayName.trim().toUpperCase() === boardLabel.toUpperCase()
        );
      })
    : undefined;

  const classNode =
    boardNode && schoolClass != null
      ? offerings.find((o) => {
          const parentId = o.parentOffering?.id ?? o.parentOfferingId;
          return parentId === boardNode.id && parseClassNumber(o.displayName) === schoolClass;
        })
      : undefined;

  return {
    studyAreaKey: 'SCHOOL_EDUCATION',
    rootOfferingId: root.id,
    boardOfferingId: boardNode?.id,
    classOfferingId: classNode?.id,
  };
}
