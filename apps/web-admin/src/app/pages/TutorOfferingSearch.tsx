import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_OFFERINGS } from '@tutorix/shared-graphql';
import {
  STUDY_AREAS,
  STUDY_AREAS_OPTIONS,
  cascadeFieldLabel,
} from '@tutorix/shared-utils';

type OfferingNode = {
  id: number;
  name: string;
  displayName: string;
  level: number;
  order: number;
  parentOffering?: { id: number } | null;
};

type OfferingsData = {
  offerings: OfferingNode[];
};

const SELECT_CLASS_NAME =
  'h-11 w-full rounded-xl border border-sky-200/80 bg-white px-3 text-sm text-primary shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-muted';

export function TutorOfferingSearch({
  resetToken,
  active,
  onSearch,
  onClear,
}: {
  resetToken: number;
  active: boolean;
  onSearch: (offeringId: number) => void;
  onClear: () => void;
}) {
  const [studyArea, setStudyArea] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const skipReset = useRef(true);

  const {
    data: offeringsData,
    loading: offeringsLoading,
    error: offeringsError,
  } = useQuery<OfferingsData>(GET_OFFERINGS, { fetchPolicy: 'cache-first' });

  const offerings = useMemo(
    () => offeringsData?.offerings ?? [],
    [offeringsData?.offerings],
  );

  const rootOfferings = useMemo(
    () => offerings.filter((offering) => offering.parentOffering == null),
    [offerings],
  );

  const rootOfferingForStudyArea = useMemo(() => {
    if (!studyArea) return null;
    const option = STUDY_AREAS_OPTIONS.find((entry) => entry.key === studyArea);
    if (!option) return null;
    return (
      rootOfferings.find(
        (offering) =>
          offering.displayName === option.label || offering.name === option.label,
      ) ?? null
    );
  }, [studyArea, rootOfferings]);

  const levelsConfig = studyArea ? (STUDY_AREAS[studyArea] ?? []) : [];

  const isSelectionComplete =
    !!studyArea &&
    !!rootOfferingForStudyArea &&
    selectedIds.length === levelsConfig.length &&
    selectedIds.every(Boolean);

  useEffect(() => {
    if (skipReset.current) {
      skipReset.current = false;
      return;
    }
    setStudyArea('');
    setSelectedIds([]);
  }, [resetToken]);

  const getChildren = (parentId: number) =>
    offerings
      .filter(
        (offering) =>
          offering.parentOffering != null &&
          String(offering.parentOffering.id) === String(parentId),
      )
      .sort((a, b) => a.order - b.order || a.id - b.id);

  const handleStudyAreaChange = (value: string) => {
    setStudyArea(value);
    setSelectedIds([]);
  };

  const handleLevelSelect = (levelIndex: number, offeringId: number) => {
    setSelectedIds((prev) => {
      const next = prev.slice(0, levelIndex + 1);
      next[levelIndex] = offeringId;
      return next;
    });
  };

  const handleSearch = () => {
    if (!isSelectionComplete) return;
    onSearch(selectedIds[selectedIds.length - 1]);
  };

  const handleClear = () => {
    setStudyArea('');
    setSelectedIds([]);
    onClear();
  };

  return (
    <div className="mt-4 rounded-xl border border-purple-200/80 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-primary">Search by offering</h2>
      <p className="mt-1 text-sm text-muted">
        Tutors who passed the proficiency test for this offering, at any onboarding stage.
      </p>

      {offeringsLoading && (
        <p className="mt-4 text-sm text-muted">Loading offering catalog…</p>
      )}

      {offeringsError && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          Could not load offerings for search.
        </p>
      )}

      {!offeringsLoading && !offeringsError && (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="offering-study-area" className="mb-1 block text-sm font-medium text-primary">
              Study area
            </label>
            <select
              id="offering-study-area"
              value={studyArea}
              onChange={(event) => handleStudyAreaChange(event.target.value)}
              className={SELECT_CLASS_NAME}
            >
              <option value="">Select…</option>
              {STUDY_AREAS_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
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
              const isBlocked = levelIndex > 0 && !selectedIds[levelIndex - 1];
              const label = cascadeFieldLabel(studyArea, levelConfig.name);

              if (children.length === 0 && levelIndex > 0) return null;

              return (
                <div key={levelConfig.name}>
                  <label
                    htmlFor={`offering-level-${levelIndex}`}
                    className="mb-1 block text-sm font-medium text-primary"
                  >
                    {label}
                  </label>
                  <select
                    id={`offering-level-${levelIndex}`}
                    value={selectedId ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === '') return;
                      handleLevelSelect(levelIndex, parseInt(value, 10));
                    }}
                    disabled={isBlocked}
                    className={SELECT_CLASS_NAME}
                  >
                    <option value="">Select…</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSearch}
          disabled={!isSelectionComplete || offeringsLoading}
          className="h-11 shrink-0 rounded-xl border border-purple-200 bg-white px-4 text-sm font-semibold text-purple-800 shadow-sm transition hover:border-purple-400 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Search offering
        </button>
        {(studyArea || active) && (
          <button
            type="button"
            onClick={handleClear}
            className="h-11 shrink-0 rounded-xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-800 shadow-sm transition hover:border-sky-400 hover:bg-sky-50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
