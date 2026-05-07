import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_OFFERINGS, SAVE_TUTOR_OFFERINGS } from '@tutorix/shared-graphql';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql';
import {
  STUDY_AREAS,
  STUDY_AREAS_OPTIONS,
} from '@tutorix/shared-utils';
import type { StepComponentProps } from '../types';

type OfferingNode = {
  id: number;
  name: string;
  displayName: string;
  level: number;
  order: number;
  parentOffering?: { id: number } | null;
  rootOffering?: { id: number } | null;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const TutorOfferings: React.FC<StepComponentProps> = ({
  onComplete,
  onBack,
}) => {
  const [studyArea, setStudyArea] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [saveOfferings, { loading: isSaving }] = useMutation(SAVE_TUTOR_OFFERINGS, {
    refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
    awaitRefetchQueries: true,
    onError: (err) => {
      setSubmitError(
        err.graphQLErrors?.[0]?.message ?? err.message ?? 'Failed to save offerings',
      );
    },
  });

  const { data, loading, error } = useQuery<{ offerings: OfferingNode[] }>(
    GET_OFFERINGS,
    { fetchPolicy: 'cache-first' }
  );

  const offerings = useMemo(
    () => data?.offerings ?? [],
    [data?.offerings]
  );

  const rootOfferings = useMemo(() => {
    return offerings.filter(
      (o) => o.parentOffering == null
    );
  }, [offerings]);

  const rootOfferingForStudyArea = useMemo(() => {
    if (!studyArea) return null;
    const opt = STUDY_AREAS_OPTIONS.find((o) => o.key === studyArea);
    if (!opt) return null;
    return rootOfferings.find(
      (o) =>
        o.displayName === opt.label || o.name === opt.label
    ) ?? null;
  }, [studyArea, rootOfferings]);

  const levelsConfig = studyArea ? STUDY_AREAS[studyArea] ?? [] : [];

  const isComplete = useMemo(() => {
    if (!studyArea || !rootOfferingForStudyArea) return false;
    return selectedIds.length === levelsConfig.length;
  }, [studyArea, rootOfferingForStudyArea, selectedIds.length, levelsConfig.length]);

  const handleStudyAreaChange = (value: string) => {
    setStudyArea(value);
    setSelectedIds([]);
  };

  const isStringEquals = (a: unknown, b: unknown) =>
    String(a) === String(b);

  const getChildren = (parentId: number) =>
    offerings
      .filter(
        (o) =>
          o.parentOffering != null &&
          isStringEquals(o.parentOffering.id, parentId)
      )
      .sort((a, b) => a.order - b.order || a.id - b.id);

  const handleLevelSelect = (levelIndex: number, offeringId: number) => {
    setSelectedIds((prev) => {
      const next = prev.slice(0, levelIndex + 1);
      next[levelIndex] = offeringId;
      return next;
    });
  };

  const handleContinue = async () => {
    setSubmitError(null);
    const leafOfferingId = selectedIds[selectedIds.length - 1];
    if (!leafOfferingId) return;
    try {
      await saveOfferings({
        variables: {
          input: {
            offeringIds: [leafOfferingId],
            advanceToNextStep: true,
          },
        },
      });
      onComplete();
    } catch {
      // onError handles message
    }
  };

  const inputCls = (hasError: boolean) =>
    `h-11 w-full rounded-md border bg-white px-3 text-primary shadow-sm focus:outline-none focus:border-primary ${
      hasError ? 'border-danger' : 'border-subtle'
    }`;

  if (loading) {
    return (
      <div className="space-y-8">
        <p className="text-sm text-muted">Loading offerings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <p className="text-sm text-danger">
          Failed to load offerings. Please try again.
        </p>
        <div className="flex justify-end gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="h-11 rounded-lg border border-subtle px-6 text-sm font-semibold text-primary"
            >
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted">
          Choose what you want to teach. Select a study area to get started.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-primary">
          Study area <span className="text-danger">*</span>
        </label>
        <select
          value={studyArea}
          onChange={(e) => handleStudyAreaChange(e.target.value)}
          className={inputCls(false)}
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
              : selectedIds[levelIndex - 1] ?? 0;
          const children = getChildren(parentId);
          const selectedId = selectedIds[levelIndex];

          if (children.length === 0 && levelIndex > 0) return null;
          const isBlocked = levelIndex > 0 && !selectedIds[levelIndex - 1];

          return (
            <div key={levelConfig.name} className="space-y-1">
              <label className="text-sm font-medium text-primary">
                {capitalize(levelConfig.name)} <span className="text-danger">*</span>
              </label>
              <select
                value={selectedId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') return;
                  handleLevelSelect(levelIndex, parseInt(val, 10));
                }}
                disabled={isBlocked}
                className={inputCls(false)}
              >
                <option value="">Select...</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>
          );
        })}

      {submitError && (
        <p className="text-sm text-danger">{submitError}</p>
      )}
      <div className="flex justify-end gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="h-11 rounded-lg border border-subtle px-6 text-sm font-semibold text-primary shadow-sm transition hover:border-primary"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleContinue}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
          disabled={!isComplete || isSaving}
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
};
