import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_MY_STUDENT_PROFILE,
  GET_OFFERINGS,
  SEARCH_TUTORS,
} from '@tutorix/shared-graphql';
import {
  cascadeFieldLabel,
  mapStudentEducationToOfferingPath,
  STUDY_AREAS,
  STUDY_AREAS_OPTIONS,
} from '@tutorix/shared-utils';
import { analytics } from '../../../lib/analytics';
import { TutorSearchCard, type TutorSearchCardHit } from '../student-home/TutorSearchCard';
import {
  readStudentTutorSearchDraft,
  writeStudentTutorSearchDraft,
} from './student-tutor-search-draft';

type StudentTutorSearchPageProps = {
  onOpenTutorPreview: (tutorId: string, offeringId: string) => void;
};

type OfferingNode = {
  id: number;
  name?: string;
  displayName: string;
  level: number;
  order?: number;
  parentOffering?: { id: number } | null;
};

const STUDY_MODE_OPTIONS: { value: 'OFFLINE' | 'ONLINE' | 'ANY'; label: string }[] = [
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'ANY', label: 'Any' },
];

const GROUP_PREFERENCE_OPTIONS: { value: 'INDIVIDUAL' | 'GROUP' | 'ANY'; label: string }[] = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'GROUP', label: 'Group' },
  { value: 'ANY', label: 'Any' },
];

const selectClass =
  'h-11 w-full rounded-lg border border-subtle bg-white px-3 text-sm text-primary shadow-sm focus:border-[#5fa8ff] focus:outline-none focus:ring-2 focus:ring-[#5fa8ff]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-muted';

function segmentClass(active: boolean): string {
  return `flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
    active
      ? 'border-[#5fa8ff] bg-sky-50 text-[#1d4ed8]'
      : 'border-subtle bg-white text-primary hover:border-[#5fa8ff]/50'
  }`;
}

function sortOfferings(nodes: OfferingNode[]): OfferingNode[] {
  return [...nodes].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.displayName.localeCompare(b.displayName);
  });
}

export const StudentTutorSearchPage: React.FC<StudentTutorSearchPageProps> = ({
  onOpenTutorPreview,
}) => {
  const { data: profileData } = useQuery(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: offeringsData } = useQuery<{ offerings: OfferingNode[] }>(GET_OFFERINGS, {
    fetchPolicy: 'cache-first',
  });

  const student = profileData?.myStudentProfile;
  const offerings = offeringsData?.offerings ?? [];

  const educationPath = useMemo(
    () =>
      mapStudentEducationToOfferingPath(
        student?.board,
        student?.schoolClass,
        offerings,
        student?.boardOther,
      ),
    [offerings, student?.board, student?.boardOther, student?.schoolClass],
  );

  const restored = readStudentTutorSearchDraft();
  const [studyArea, setStudyArea] = useState(restored?.studyArea ?? 'SCHOOL_EDUCATION');
  const [selectedIds, setSelectedIds] = useState<number[]>(restored?.selectedIds ?? []);
  const [deliveryMode, setDeliveryMode] = useState<'ANY' | 'ONLINE' | 'OFFLINE'>(
    restored?.deliveryMode ?? 'ANY',
  );
  const [classFormat, setClassFormat] = useState<'ANY' | 'INDIVIDUAL' | 'GROUP'>(
    restored?.classFormat ?? 'ANY',
  );
  const [maxRateInr, setMaxRateInr] = useState<number | ''>(restored?.maxRateInr ?? '');
  const [radiusKm, setRadiusKm] = useState(restored?.radiusKm ?? 10);
  const educationAppliedRef = useRef(Boolean(restored));

  useEffect(() => {
    writeStudentTutorSearchDraft({
      studyArea,
      selectedIds,
      deliveryMode,
      classFormat,
      maxRateInr,
      radiusKm,
    });
  }, [classFormat, deliveryMode, maxRateInr, radiusKm, selectedIds, studyArea]);

  useEffect(() => {
    if (!educationPath || educationAppliedRef.current) return;
    educationAppliedRef.current = true;
    setStudyArea(educationPath.studyAreaKey);
    setSelectedIds(
      [educationPath.boardOfferingId, educationPath.classOfferingId].filter(
        (id): id is number => id != null,
      ),
    );
  }, [educationPath]);

  const levelsConfig = studyArea ? STUDY_AREAS[studyArea] ?? [] : [];
  const offeringId =
    levelsConfig.length > 0 && selectedIds.length === levelsConfig.length
      ? selectedIds[levelsConfig.length - 1]
      : null;

  const searchInput = offeringId
    ? {
        offeringId: String(offeringId),
        deliveryMode,
        classFormat,
        maxRateInr: maxRateInr === '' ? undefined : Number(maxRateInr),
        radiusKm,
        sortBy: 'BEST_MATCH',
      }
    : undefined;

  const { data: searchData, loading: searchLoading } = useQuery(SEARCH_TUTORS, {
    variables: { input: searchInput },
    skip: !searchInput,
    fetchPolicy: 'cache-and-network',
  });

  const connection = searchData?.searchTutors;
  const hits = connection?.items ?? [];
  const subjectLabel =
    offerings.find((o) => o.id === offeringId)?.displayName ?? 'Choose a subject';

  useEffect(() => {
    if (!offeringId || !connection) return;
    analytics.trackTutorSearch(
      subjectLabel,
      {
        deliveryMode,
        classFormat,
        maxRateInr: maxRateInr === '' ? undefined : Number(maxRateInr),
        radiusKm,
      },
      connection.items.length,
    );
  }, [classFormat, connection, deliveryMode, maxRateInr, offeringId, radiusKm, subjectLabel]);

  const rootOfferings = offerings.filter((o) => o.parentOffering == null);
  const studyOpt = STUDY_AREAS_OPTIONS.find((o) => o.key === studyArea);
  const rootOffering =
    studyOpt &&
    rootOfferings.find((o) => o.displayName === studyOpt.label || o.name === studyOpt.label);
  const getChildren = (parentId: number) =>
    sortOfferings(
      offerings.filter((o) => o.parentOffering && String(o.parentOffering.id) === String(parentId)),
    );

  const setCascadeValue = (index: number, nextId: number | null) => {
    setSelectedIds((prev) => {
      if (nextId == null) return prev.slice(0, index);
      if (prev[index] === nextId) return prev;
      const next = prev.slice(0, index);
      next[index] = nextId;
      return next;
    });
  };

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Find a tutor</h1>
        <p className="mt-1 text-sm text-muted">
          We start from your class details. Choose a subject to see certified tutors.
        </p>
      </div>

      <div className="space-y-6 rounded-2xl border border-primary/10 bg-white p-5 shadow-sm sm:p-6">
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-primary">What you want to learn</h2>
            <p className="mt-1 text-sm text-muted">
              Board and class come from your profile. You can change them any time.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-primary">Study area</span>
              <select
                aria-label="Study area"
                value={studyArea}
                onChange={(e) => {
                  setStudyArea(e.target.value);
                  setSelectedIds([]);
                }}
                className={selectClass}
              >
                {STUDY_AREAS_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {levelsConfig.map((level, index) => {
              const parentReady = index === 0 ? Boolean(rootOffering) : Boolean(selectedIds[index - 1]);
              const parentId = index === 0 ? rootOffering?.id : selectedIds[index - 1];
              const children = parentId ? getChildren(parentId) : [];
              const label = cascadeFieldLabel(studyArea, level.name);
              const selectedId = selectedIds[index];
              const isSubject = index === levelsConfig.length - 1;
              return (
                <label
                  key={level.name}
                  className={`block space-y-1.5 ${isSubject ? 'sm:col-span-2' : ''}`}
                >
                  <span className="text-sm font-semibold text-primary">{label}</span>
                  <select
                    aria-label={label}
                    value={selectedId != null ? String(selectedId) : ''}
                    disabled={!parentReady}
                    onChange={(e) =>
                      setCascadeValue(
                        index,
                        e.target.value === '' ? null : Number.parseInt(e.target.value, 10),
                      )
                    }
                    className={selectClass}
                  >
                    <option value="">{parentReady ? `Select ${label.toLowerCase()}` : '—'}</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 border-t border-subtle pt-5">
          <h2 className="text-base font-semibold text-primary">How you want to learn</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-semibold text-primary">Study Mode</legend>
              <div className="flex gap-2">
                {STUDY_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={deliveryMode === opt.value}
                    className={segmentClass(deliveryMode === opt.value)}
                    onClick={() => setDeliveryMode(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-semibold text-primary">Group Preference</legend>
              <div className="flex gap-2">
                {GROUP_PREFERENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={classFormat === opt.value}
                    className={segmentClass(classFormat === opt.value)}
                    onClick={() => setClassFormat(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {deliveryMode !== 'ONLINE' ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-primary">Distance</span>
                <select
                  aria-label="Distance"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className={selectClass}
                >
                  {[5, 10, 15, 25].map((km) => (
                    <option key={km} value={km}>
                      Within {km} km
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-primary">Budget (optional)</span>
              <input
                type="number"
                min={1}
                aria-label="Budget"
                placeholder="Max ₹ / class"
                value={maxRateInr}
                onChange={(e) =>
                  setMaxRateInr(e.target.value === '' ? '' : Number(e.target.value))
                }
                className={selectClass}
              />
            </label>
          </div>
        </section>
      </div>

      {connection?.forcedOnlineOnly ? (
        <p className="text-sm text-muted">
          Add a home address with a map location to search nearby offline tutors. Showing online
          matches for now.
        </p>
      ) : null}

      {!offeringId ? (
        <p className="text-sm text-muted">Choose a subject to see certified tutors.</p>
      ) : searchLoading ? (
        <p className="text-sm text-muted">Finding tutors…</p>
      ) : hits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-subtle bg-white p-6 text-center">
          <p className="text-sm text-muted">No tutors match these filters yet.</p>
          {deliveryMode === 'OFFLINE' ? (
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-[#4a97f5]"
              onClick={() => setDeliveryMode('ANY')}
            >
              Include online tutors
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-primary">
            {hits.length} certified tutor{hits.length === 1 ? '' : 's'}
            {connection?.forcedOnlineOnly ? ' · online' : ''}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {hits.map((hit: TutorSearchCardHit) => (
              <TutorSearchCard
                key={String(hit.tutorId)}
                hit={hit}
                onView={() => {
                  analytics.trackTutorViewed(hit.tutorId);
                  onOpenTutorPreview(String(hit.tutorId), String(hit.matchingOfferingId));
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
