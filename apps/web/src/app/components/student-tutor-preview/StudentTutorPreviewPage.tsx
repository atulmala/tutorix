import React, { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { TUTOR_SEARCH_DETAIL } from '@tutorix/shared-graphql';
import {
  formatExperienceDuration,
  formatExperiencePeriod,
  formatInr,
  formatQualificationInstitutionGrade,
  formatQualificationTitle,
  monthsToExperienceDuration,
} from '@tutorix/shared-utils';
import { analytics } from '../../../lib/analytics';

type StudentTutorPreviewPageProps = {
  tutorId: string;
  offeringId: string;
  onBookClass: () => void;
};

type PreviewExperience = {
  jobTitle: string;
  employerName?: string | null;
  employerAddress?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
};

type PreviewQualification = {
  qualificationType: string;
  degreeName?: string | null;
  gradeType: string;
  gradeValue: string;
  boardOrUniversity: string;
};

export const StudentTutorPreviewPage: React.FC<StudentTutorPreviewPageProps> = ({
  tutorId,
  offeringId,
  onBookClass,
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

  const experience =
    detail.totalExperienceMonths > 0
      ? formatExperienceDuration(monthsToExperienceDuration(detail.totalExperienceMonths))
      : '';
  const recentExperiences = (detail.recentExperiences ?? []) as PreviewExperience[];
  const topQualifications = (detail.topQualifications ?? []) as PreviewQualification[];

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
            {experience ? <p className="mt-1 text-sm text-muted">{experience}</p> : null}
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
        <button
          type="button"
          onClick={onBookClass}
          className="mt-4 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
        >
          Book class
        </button>
      </section>

      {recentExperiences.length > 0 ? (
        <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-primary">Experience</h2>
          <ul className="mt-3 space-y-3">
            {recentExperiences.map((exp, index) => (
              <li key={`${exp.jobTitle}-${index}`}>
                <p className="font-semibold text-primary">
                  {exp.employerName || 'Self-employed'}
                </p>
                {exp.employerAddress ? (
                  <p className="text-sm text-muted">{exp.employerAddress}</p>
                ) : null}
                <p className="text-sm text-muted">{formatExperiencePeriod(exp)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {topQualifications.length > 0 ? (
        <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-primary">Education</h2>
          <ul className="mt-3 space-y-3">
            {topQualifications.map((qual, index) => {
              const institutionGrade = formatQualificationInstitutionGrade(
                qual.boardOrUniversity,
                qual.gradeType,
                qual.gradeValue,
              );
              return (
                <li key={`${qual.qualificationType}-${index}`}>
                  <p className="font-semibold text-primary">
                    {formatQualificationTitle(qual.qualificationType, qual.degreeName)}
                  </p>
                  {institutionGrade ? (
                    <p className="text-sm text-muted">{institutionGrade}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

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
