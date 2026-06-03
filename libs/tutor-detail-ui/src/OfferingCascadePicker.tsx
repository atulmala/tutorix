import React, { useMemo, useState } from 'react';
import {
  STUDY_AREAS,
  STUDY_AREAS_OPTIONS,
} from '@tutorix/shared-utils';

export type OfferingCatalogNode = {
  id: number;
  name: string;
  displayName: string;
  level: number;
  order: number;
  parentOffering?: { id: number } | null;
  rootOffering?: { id: number } | null;
};

export type OfferingCascadePickerProps = {
  offerings: OfferingCatalogNode[];
  excludeOfferingIds?: number[];
  introText?: string;
  submitLabel?: string;
  loading?: boolean;
  error?: string | null;
  saving?: boolean;
  onSubmit: (leafOfferingId: number) => void;
  renderSelect?: (props: {
    label: string;
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
    options: { id: number; displayName: string }[];
  }) => React.ReactNode;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function defaultInputCls(disabled: boolean): string {
  return `h-11 w-full rounded-md border border-subtle bg-white px-3 text-primary shadow-sm focus:outline-none focus:border-primary${
    disabled ? ' cursor-not-allowed opacity-60' : ''
  }`;
}

export function OfferingCascadePicker({
  offerings,
  excludeOfferingIds = [],
  introText = 'Choose what you want to teach. Select a study area to get started.',
  submitLabel = 'Continue',
  loading = false,
  error = null,
  saving = false,
  onSubmit,
  renderSelect,
}: OfferingCascadePickerProps) {
  const [studyArea, setStudyArea] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const excludeSet = useMemo(() => new Set(excludeOfferingIds), [excludeOfferingIds]);

  const rootOfferings = useMemo(
    () => offerings.filter((o) => o.parentOffering == null),
    [offerings],
  );

  const rootOfferingForStudyArea = useMemo(() => {
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

  const isComplete = useMemo(() => {
    if (!studyArea || !rootOfferingForStudyArea) return false;
    return selectedIds.length === levelsConfig.length;
  }, [studyArea, rootOfferingForStudyArea, selectedIds.length, levelsConfig.length]);

  const leafOfferingId = selectedIds[selectedIds.length - 1];
  const leafExcluded = leafOfferingId != null && excludeSet.has(leafOfferingId);

  const handleStudyAreaChange = (value: string) => {
    setStudyArea(value);
    setSelectedIds([]);
  };

  const isStringEquals = (a: unknown, b: unknown) => String(a) === String(b);

  const getChildren = (parentId: number) =>
    offerings
      .filter(
        (o) =>
          o.parentOffering != null &&
          isStringEquals(o.parentOffering.id, parentId),
      )
      .sort((a, b) => a.order - b.order || a.id - b.id);

  const handleLevelSelect = (levelIndex: number, offeringId: number) => {
    setSelectedIds((prev) => {
      const next = prev.slice(0, levelIndex + 1);
      next[levelIndex] = offeringId;
      return next;
    });
  };

  const renderDefaultSelect = (props: {
    label: string;
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
    options: { id: number; displayName: string }[];
  }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-primary">
        {props.label} <span className="text-danger">*</span>
      </label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
        className={defaultInputCls(props.disabled)}
      >
        <option value="">Select...</option>
        {props.options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.displayName}
          </option>
        ))}
      </select>
    </div>
  );

  const selectRenderer = renderSelect ?? renderDefaultSelect;

  if (loading) {
    return <p className="text-sm text-muted">Loading offerings...</p>;
  }

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">{introText}</p>

      <div className="space-y-1">
        <label className="text-sm font-medium text-primary">
          Study area <span className="text-danger">*</span>
        </label>
        <select
          value={studyArea}
          onChange={(e) => handleStudyAreaChange(e.target.value)}
          className={defaultInputCls(false)}
        >
          <option value="">Select...</option>
          {STUDY_AREAS_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {studyArea &&
        rootOfferingForStudyArea &&
        levelsConfig.map((levelConfig, levelIndex) => {
          const parentId =
            levelIndex === 0
              ? rootOfferingForStudyArea.id
              : (selectedIds[levelIndex - 1] ?? 0);
          const children = getChildren(parentId);
          const selectedId = selectedIds[levelIndex];

          if (children.length === 0 && levelIndex > 0) return null;
          const isBlocked = levelIndex > 0 && !selectedIds[levelIndex - 1];

          return (
            <div key={levelConfig.name}>
              {selectRenderer({
                label: capitalize(levelConfig.name),
                value: selectedId != null ? String(selectedId) : '',
                disabled: isBlocked,
                onChange: (val) => {
                  if (!val) return;
                  handleLevelSelect(levelIndex, Number.parseInt(val, 10));
                },
                options: children.map((c) => ({
                  id: c.id,
                  displayName: c.displayName,
                })),
              })}
            </div>
          );
        })}

      {leafExcluded ? (
        <p className="text-sm text-danger">You already teach this offering.</p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => leafOfferingId && onSubmit(leafOfferingId)}
          disabled={!isComplete || saving || leafExcluded}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
        >
          {saving ? 'Please wait...' : submitLabel}
        </button>
      </div>
    </div>
  );
}
