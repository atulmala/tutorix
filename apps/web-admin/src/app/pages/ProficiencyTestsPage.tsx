import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  GET_ADMIN_PROFICIENCY_TESTS,
  GET_OFFERINGS,
} from '@tutorix/shared-graphql';
import {
  STUDY_AREAS,
  STUDY_AREAS_OPTIONS,
} from '@tutorix/shared-utils';

type OfferingNode = {
  id: number;
  name: string;
  displayName: string;
  level: number;
  order: number;
  parentOffering?: { id: number } | null;
};

type AdminProficiencyTestListItemRow = {
  id: number;
  studyArea: string;
  board: string;
  classLabel: string;
  subjects: string;
  questionCount: number;
  offeringIds: number[];
};

type AdminProficiencyTestsData = {
  adminProficiencyTests: AdminProficiencyTestListItemRow[];
};

type OfferingsData = {
  offerings: OfferingNode[];
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ProficiencyTestsTable({
  items,
  emptyMessage,
}: {
  items: AdminProficiencyTestListItemRow[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <p className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-fuchsia-200 bg-gradient-to-r from-fuchsia-100/80 to-violet-50/50 text-xs font-semibold uppercase tracking-wide text-fuchsia-900">
            <th className="px-4 py-3">Test ID</th>
            <th className="px-4 py-3">Study area</th>
            <th className="px-4 py-3">Board</th>
            <th className="px-4 py-3">Class</th>
            <th className="px-4 py-3">Subjects</th>
            <th className="px-4 py-3">No. of questions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((test, index) => (
            <tr
              key={test.id}
              className={
                index % 2 === 0
                  ? 'border-b border-gray-100 bg-white'
                  : 'border-b border-gray-100 bg-fuchsia-50/20'
              }
            >
              <td className="px-4 py-3 font-medium">
                <Link
                  to={`/proficiency-tests/${test.id}`}
                  className="text-fuchsia-700 hover:text-fuchsia-900 hover:underline"
                >
                  {test.id}
                </Link>
              </td>
              <td className="px-4 py-3">{test.studyArea}</td>
              <td className="px-4 py-3">{test.board}</td>
              <td className="px-4 py-3">{test.classLabel}</td>
              <td className="px-4 py-3">{test.subjects}</td>
              <td className="px-4 py-3">{test.questionCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProficiencyTestsPage() {
  const [studyArea, setStudyArea] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchedLeafOfferingId, setSearchedLeafOfferingId] = useState<
    number | null
  >(null);
  const [hasSearched, setHasSearched] = useState(false);

  const {
    data: testsData,
    loading: testsLoading,
    error: testsError,
  } = useQuery<AdminProficiencyTestsData>(GET_ADMIN_PROFICIENCY_TESTS);

  const {
    data: offeringsData,
    loading: offeringsLoading,
    error: offeringsError,
  } = useQuery<OfferingsData>(GET_OFFERINGS, { fetchPolicy: 'cache-first' });

  const items = testsData?.adminProficiencyTests ?? [];
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
    setHasSearched(false);
    setSearchedLeafOfferingId(null);
  };

  const handleLevelSelect = (levelIndex: number, offeringId: number) => {
    setSelectedIds((prev) => {
      const next = prev.slice(0, levelIndex + 1);
      next[levelIndex] = offeringId;
      return next;
    });
    setHasSearched(false);
    setSearchedLeafOfferingId(null);
  };

  const handleSearch = () => {
    if (!isSelectionComplete) return;
    const leafOfferingId = selectedIds[selectedIds.length - 1];
    setSearchedLeafOfferingId(leafOfferingId);
    setHasSearched(true);
  };

  const handleClearSearch = () => {
    setStudyArea('');
    setSelectedIds([]);
    setHasSearched(false);
    setSearchedLeafOfferingId(null);
  };

  const filteredItems = useMemo(() => {
    if (!hasSearched || searchedLeafOfferingId == null) return [];
    return items.filter((test) =>
      test.offeringIds.includes(searchedLeafOfferingId),
    );
  }, [hasSearched, items, searchedLeafOfferingId]);

  const loading = testsLoading || offeringsLoading;
  const error = testsError ?? offeringsError;

  const selectClassName =
    'h-11 w-full rounded-lg border border-subtle bg-white px-3 text-sm text-primary shadow-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-muted';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">Proficiency tests</h1>
        <p className="mt-1 text-sm text-muted">
          Search by study area and offering path to find a proficiency test.
        </p>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-fuchsia-200 bg-white p-5 shadow-md">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fuchsia-900">
          Search
        </h2>

        {offeringsLoading && (
          <p className="mt-4 text-sm text-muted">Loading offering catalog…</p>
        )}

        {offeringsError && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            Could not load offerings for search.
          </p>
        )}

        {!offeringsLoading && !offeringsError && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-primary">Study area</label>
              <select
                value={studyArea}
                onChange={(event) => handleStudyAreaChange(event.target.value)}
                className={selectClassName}
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

                if (children.length === 0 && levelIndex > 0) return null;

                return (
                  <div key={levelConfig.name} className="space-y-1">
                    <label className="text-sm font-medium text-primary">
                      {capitalize(levelConfig.name)}
                    </label>
                    <select
                      value={selectedId ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === '') return;
                        handleLevelSelect(levelIndex, parseInt(value, 10));
                      }}
                      disabled={isBlocked}
                      className={selectClassName}
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

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSearch}
            disabled={!isSelectionComplete || loading}
            className="h-10 rounded-lg bg-fuchsia-600 px-5 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:bg-fuchsia-300"
          >
            Search
          </button>
          {(hasSearched || studyArea) && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="h-10 rounded-lg border border-subtle px-5 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-fuchsia-200 bg-white shadow-md">
        {loading && (
          <p className="bg-gradient-to-r from-fuchsia-50/50 to-violet-50/50 p-6 text-sm text-muted">
            Loading proficiency tests…
          </p>
        )}

        {error && (
          <p className="p-6 text-sm text-red-600" role="alert">
            Could not load proficiency tests. Please try again.
          </p>
        )}

        {!loading && !error && !hasSearched && (
          <p className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 text-sm text-muted">
            Select a study area and complete the offering path, then click Search
            to view the matching proficiency test.
          </p>
        )}

        {!loading && !error && hasSearched && (
          <ProficiencyTestsTable
            items={filteredItems}
            emptyMessage="No proficiency test found for the selected offering."
          />
        )}
      </div>
    </div>
  );
}
