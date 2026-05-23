import { OfferingEntity } from '../offerings/entities/offering.entity';
import { ProficiencyTestEntity } from '../proficiency/entities/proficiency-test.entity';
import { AdminProficiencyTestListItem } from './dto/admin-proficiency-test-list-item.dto';

const EMPTY_LABEL = '—';

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function joinLabels(values: Iterable<string>): string {
  const sorted = uniqueSorted(values);
  return sorted.length > 0 ? sorted.join(', ') : EMPTY_LABEL;
}

function getAncestors(
  offering: OfferingEntity,
  offeringsById: Map<number, OfferingEntity>,
): OfferingEntity[] {
  const ancestors: OfferingEntity[] = [];
  let current = offering;

  while (true) {
    const parentId =
      current.parentOffering?.id ??
      (current as OfferingEntity & { parentOfferingId?: number }).parentOfferingId;
    if (parentId == null) break;

    const parent = offeringsById.get(parentId);
    if (!parent) break;

    ancestors.unshift(parent);
    current = parent;
  }

  return ancestors;
}

function getRootOffering(
  offering: OfferingEntity,
  ancestors: OfferingEntity[],
): OfferingEntity {
  if (ancestors.length > 0) {
    return ancestors[0];
  }
  return offering.rootOffering ?? offering;
}

export function mapProficiencyTestToListItem(
  test: ProficiencyTestEntity,
  offeringsById: Map<number, OfferingEntity>,
  questionCount: number,
): AdminProficiencyTestListItem {
  const linkedOfferings = (test.offerings ?? []).filter((o) => !o.deleted);

  if (linkedOfferings.length === 0) {
    return {
      id: test.id,
      studyArea: EMPTY_LABEL,
      board: EMPTY_LABEL,
      classLabel: EMPTY_LABEL,
      subjects: EMPTY_LABEL,
      questionCount,
      offeringIds: [],
    };
  }

  const offeringIds: number[] = [];

  const studyAreas = new Set<string>();
  const boards = new Set<string>();
  const classLabels = new Set<string>();
  const subjects = new Set<string>();

  for (const leaf of linkedOfferings) {
    const resolvedLeaf = offeringsById.get(leaf.id) ?? leaf;
    offeringIds.push(resolvedLeaf.id);
    const ancestors = getAncestors(resolvedLeaf, offeringsById);
    const root = getRootOffering(resolvedLeaf, ancestors);

    studyAreas.add(root.displayName);

    if (ancestors.length >= 3) {
      boards.add(ancestors[1].displayName);
      classLabels.add(ancestors[2].displayName);
      subjects.add(resolvedLeaf.displayName);
    } else if (ancestors.length === 2) {
      boards.add(ancestors[1].displayName);
      subjects.add(resolvedLeaf.displayName);
    } else if (ancestors.length === 1) {
      boards.add(ancestors[0].displayName);
      subjects.add(resolvedLeaf.displayName);
    } else {
      subjects.add(resolvedLeaf.displayName);
    }
  }

  return {
    id: test.id,
    studyArea: joinLabels(studyAreas),
    board: joinLabels(boards),
    classLabel: joinLabels(classLabels),
    subjects: joinLabels(subjects),
    questionCount,
    offeringIds: [...new Set(offeringIds)].sort((a, b) => a - b),
  };
}
