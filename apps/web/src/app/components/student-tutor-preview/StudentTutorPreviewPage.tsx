import React, { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { TUTOR_SEARCH_DETAIL } from '@tutorix/shared-graphql';
import {
  formatInr,
  YEARS_OF_EXPERIENCE_LABELS,
  YearsOfExperienceEnum,
} from '@tutorix/shared-utils';
import { analytics } from '../../../lib/analytics';

type StudentTutorPreviewPageProps = {
  tutorId: string;
  offeringId: string;
};

export const StudentTutorPreviewPage: React.FC<StudentTutorPreviewPageProps> = ({
  tutorId,
  offeringId,
}) => {
  const { data, loading, error } = useQuery(TUTOR_SEARCH_DETAIL, {
    variables: { tutorId, offeringId },
    fetchPolicy: 'network-only',
  });

  const detail = data?.tutorSearchDetail;

  useEffect(() => {
    if (detail?.tutorId) {
      analytics.trackTutorViewed(detail.tutorId);
    }
  }, [detail?.tutorId]);

  if (loading) {
    return <p className="text-sm text-muted">Loading tutor…</p>;
  }
  if (error || !detail) {
    return <p className="text-sm text-danger">Could not load this tutor.</p>;
  }

  const years =
    YEARS_OF_EXPERIENCE_LABELS[detail.yearsOfExperience as YearsOfExperienceEnum] ?? '';

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          {detail.photoUrl ? (
            <img src={detail.photoUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 text-2xl font-bold text-primary">
              {detail.displayName.slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-primary">{detail.displayName}</h1>
            {years ? <p className="mt-1 text-sm text-muted">{years}</p> : null}
            <p className="mt-1 text-sm text-muted">
              {[detail.city, detail.distanceKm != null ? `${detail.distanceKm.toFixed(1)} km` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {detail.hasAvailabilityThisWeek ? (
              <p className="mt-2 text-sm font-semibold text-[#16a34a]">
                Available this week · {detail.slotsThisWeek} slot
                {detail.slotsThisWeek === 1 ? '' : 's'}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">No slots listed for this week yet.</p>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-primary">This subject</h2>
        <p className="mt-2 text-sm text-primary">{detail.matchingOffering.offeringLabel}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {detail.matchingOffering.offlineEnabled && detail.matchingOffering.offlineRateInr ? (
            <span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-800">
              Offline {formatInr(detail.matchingOffering.offlineRateInr)} / class
            </span>
          ) : null}
          {detail.matchingOffering.onlineEnabled && detail.matchingOffering.onlineRateInr ? (
            <span className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-800">
              Online {formatInr(detail.matchingOffering.onlineRateInr)} / class
            </span>
          ) : null}
          {detail.matchingOffering.freeDemoOffered ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-[#16a34a]">
              Free demo
            </span>
          ) : null}
        </div>
      </section>

      {detail.otherOfferings.length > 0 ? (
        <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-primary">Also teaches</h2>
          <ul className="mt-3 space-y-2 text-sm text-primary">
            {detail.otherOfferings.map(
              (offering: { offeringId: string; offeringLabel: string }) => (
                <li key={offering.offeringId}>{offering.offeringLabel}</li>
              ),
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
};
