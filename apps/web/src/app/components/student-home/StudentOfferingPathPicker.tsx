import React, { useMemo, useState } from 'react';
import {
  STUDY_AREAS,
  STUDY_AREAS_OPTIONS,
} from '@tutorix/shared-utils';

export type StudentOfferingNode = {
  id: number;
  name?: string;
  displayName: string;
  level: number;
  order?: number;
  parentOffering?: { id: number } | null;
  rootOffering?: { id: number } | null;
};

type StudentOfferingPathPickerProps = {
  offerings: StudentOfferingNode[];
  initialStudyArea?: string;
  initialSelectedIds?: number[];
  onConfirm: (leafOfferingId: number, studyArea: string, selectedIds: number[]) => void;
  onCancel?: () => void;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const StudentOfferingPathPicker: React.FC<StudentOfferingPathPickerProps> = ({
  offerings,
  initialStudyArea = '',
  initialSelectedIds = [],
  onConfirm,
  onCancel,
}) => {
  const [studyArea, setStudyArea] = useState(initialStudyArea);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);

  const rootOfferings = useMemo(
    () => offerings.filter((o) => o.parentOffering == null),
    [offerings],
  );
  const rootOffering = useMemo(() => {
    if (!studyArea) return null;
    const opt = STUDY_AREAS_OPTIONS.find((o) => o.key === studyArea);
    if (!opt) return null;
    return (
      rootOfferings.find(
        (o) => o.displayName === opt.label || o.name === opt.label,
      ) ?? null
    );
  }, [studyArea, rootOfferings]);

  const levelsConfig = studyArea ? (STUDY_AREAS[studyArea] ?? []) : [];
  const isComplete =
    Boolean(studyArea && rootOffering) && selectedIds.length === levelsConfig.length;
  const leafOfferingId = selectedIds[selectedIds.length - 1];

  const getChildren = (parentId: number) =>
    offerings
      .filter((o) => o.parentOffering != null && String(o.parentOffering.id) === String(parentId))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">What do you want to learn?</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {STUDY_AREAS_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              setStudyArea(opt.key);
              setSelectedIds([]);
            }}
            className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
              studyArea === opt.key
                ? 'border-[#5fa8ff] bg-sky-50 text-primary'
                : 'border-subtle bg-white text-primary hover:border-[#5fa8ff]/60'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {studyArea &&
        rootOffering &&
        levelsConfig.map((levelConfig, levelIndex) => {
          const parentId =
            levelIndex === 0 ? rootOffering.id : (selectedIds[levelIndex - 1] ?? 0);
          const children = getChildren(parentId);
          const selectedId = selectedIds[levelIndex];
          const blocked = levelIndex > 0 && !selectedIds[levelIndex - 1];
          if (children.length === 0 && levelIndex > 0) return null;
          return (
            <label key={levelConfig.name} className="block space-y-1">
              <span className="text-sm font-medium text-primary">
                {capitalize(levelConfig.name)}
              </span>
              <select
                value={selectedId != null ? String(selectedId) : ''}
                disabled={blocked}
                onChange={(e) => {
                  const nextId = Number.parseInt(e.target.value, 10);
                  setSelectedIds((prev) => {
                    const next = prev.slice(0, levelIndex + 1);
                    next[levelIndex] = nextId;
                    return next;
                  });
                }}
                className="h-11 w-full rounded-md border border-subtle bg-white px-3 text-primary shadow-sm disabled:opacity-60"
              >
                <option value="">Select...</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-lg border border-subtle px-4 text-sm font-semibold text-primary"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          disabled={!isComplete || leafOfferingId == null}
          onClick={() => leafOfferingId && onConfirm(leafOfferingId, studyArea, selectedIds)}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
        >
          Show tutors
        </button>
      </div>
    </div>
  );
};
