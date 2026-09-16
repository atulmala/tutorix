import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_MY_STUDENT_PROFILE,
  GET_OFFERINGS,
  SEARCH_TUTORS,
} from '@tutorix/shared-graphql';
import { mapStudentEducationToOfferingPath } from '@tutorix/shared-utils';
import { analytics } from '../../../lib/analytics';
import { StudentOfferingPathPicker } from '../student-home/StudentOfferingPathPicker';
import { TutorSearchCard, type TutorSearchCardHit } from '../student-home/TutorSearchCard';

type StudentTutorSearchPageProps = {
  onOpenTutorPreview: (tutorId: string, offeringId: string) => void;
};

const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
    active
      ? 'border-[#5fa8ff] bg-sky-50 text-primary'
      : 'border-subtle bg-white text-muted hover:border-[#5fa8ff]/50'
  }`;

export const StudentTutorSearchPage: React.FC<StudentTutorSearchPageProps> = ({
  onOpenTutorPreview,
}) => {
  const { data: profileData } = useQuery(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: offeringsData } = useQuery(GET_OFFERINGS, {
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

  const [offeringId, setOfferingId] = useState<number | null>(null);
  const [studyArea, setStudyArea] = useState('SCHOOL_EDUCATION');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'ANY' | 'ONLINE' | 'OFFLINE'>('ANY');
  const [classFormat, setClassFormat] = useState<'ANY' | 'INDIVIDUAL' | 'GROUP'>('ANY');
  const [maxRateInr, setMaxRateInr] = useState<number | ''>('');
  const [radiusKm, setRadiusKm] = useState(10);

  useEffect(() => {
    if (!educationPath) return;
    setStudyArea(educationPath.studyAreaKey);
    const ids = [educationPath.boardOfferingId, educationPath.classOfferingId].filter(
      (id): id is number => id != null,
    );
    setSelectedIds(ids);
  }, [educationPath]);

  const subjectLabel = useMemo(() => {
    if (!offeringId) return 'Choose a subject';
    const leaf = offerings.find((o: { id: number }) => o.id === offeringId);
    return leaf?.displayName ?? 'Subject';
  }, [offeringId, offerings]);

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
    fetchPolicy: 'network-only',
  });

  const connection = searchData?.searchTutors;
  const hits = connection?.items ?? [];

  useEffect(() => {
    if (!offeringId || !connection) return;
    analytics.trackTutorSearch(subjectLabel, {
      deliveryMode,
      classFormat,
      maxRateInr: maxRateInr === '' ? undefined : Number(maxRateInr),
      radiusKm,
    }, connection.items.length);
  }, [classFormat, connection, deliveryMode, maxRateInr, offeringId, radiusKm, subjectLabel]);

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Find a tutor</h1>
        <p className="mt-1 text-sm text-muted">
          Pick a subject when you are ready. Filters stay optional.
        </p>
      </div>

      <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`${chipClass(true)} text-base`}
            onClick={() => setPickerOpen(true)}
          >
            {subjectLabel}
          </button>
          {selectedIds.map((id) => {
            const offering = offerings.find((o: { id: number }) => o.id === id);
            if (!offering) return null;
            return (
              <button
                key={id}
                type="button"
                className={chipClass(false)}
                onClick={() => setPickerOpen(true)}
              >
                {offering.displayName}
              </button>
            );
          })}
          {(
            [
              ['ANY', 'Both'],
              ['OFFLINE', 'Offline'],
              ['ONLINE', 'Online'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={chipClass(deliveryMode === value)}
              onClick={() => setDeliveryMode(value)}
            >
              {label}
            </button>
          ))}
          {(
            [
              ['ANY', 'Any class'],
              ['INDIVIDUAL', '1:1'],
              ['GROUP', 'Group'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={chipClass(classFormat === value)}
              onClick={() => setClassFormat(value)}
            >
              {label}
            </button>
          ))}
          {deliveryMode !== 'ONLINE' ? (
            <label className="flex items-center gap-2 text-sm text-muted">
              Distance
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="h-9 rounded-md border border-subtle bg-white px-2 text-primary"
              >
                {[5, 10, 15, 25].map((km) => (
                  <option key={km} value={km}>
                    {km} km
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-muted">
            Budget
            <input
              type="number"
              min={1}
              placeholder="Any"
              value={maxRateInr}
              onChange={(e) =>
                setMaxRateInr(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="h-9 w-24 rounded-md border border-subtle px-2 text-primary"
            />
          </label>
        </div>
        {pickerOpen ? (
          <div className="mt-5 border-t border-subtle pt-4">
            <StudentOfferingPathPicker
              key={`${studyArea}-${selectedIds.join('-')}`}
              offerings={offerings}
              initialStudyArea={studyArea}
              initialSelectedIds={selectedIds}
              onCancel={() => setPickerOpen(false)}
              onConfirm={(leafId, nextStudyArea, ids) => {
                setOfferingId(leafId);
                setStudyArea(nextStudyArea);
                setSelectedIds(ids);
                setPickerOpen(false);
              }}
            />
          </div>
        ) : null}
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
