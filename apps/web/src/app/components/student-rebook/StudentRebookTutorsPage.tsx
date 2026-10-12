import React from 'react';
import { useQuery } from '@apollo/client';
import { STUDENT_REBOOK_TUTORS } from '@tutorix/shared-graphql';
import { TutorSearchCard } from '../student-home/TutorSearchCard';

type RebookTutorRow = {
  tutorId: number;
  catalogOfferingId: number;
  displayName: string;
  photoUrl?: string | null;
  offeringLabel: string;
  totalClassCount: number;
  lastDeliveryMode: string;
  totalExperienceMonths?: number | null;
};

type StudentRebookTutorsPageProps = {
  onOpenTutorPreview: (tutorId: string, offeringId: string) => void;
  onFindTutor: () => void;
};

function deliveryModeLabel(mode: string): string {
  return String(mode).toLowerCase() === 'offline' ? 'Offline' : 'Online';
}

export const StudentRebookTutorsPage: React.FC<StudentRebookTutorsPageProps> = ({
  onOpenTutorPreview,
  onFindTutor,
}) => {
  const { data, loading } = useQuery(STUDENT_REBOOK_TUTORS, {
    fetchPolicy: 'cache-and-network',
  });
  const tutors = (data?.studentRebookTutors ?? []) as RebookTutorRow[];

  if (loading && tutors.length === 0) {
    return <p className="text-sm text-muted">Loading your tutors…</p>;
  }

  if (tutors.length === 0) {
    return (
      <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-dashed border-subtle bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-primary">No tutors to re-book yet</h1>
        <p className="text-sm text-muted">
          After you book paid classes with a tutor, they will appear here for quick re-booking.
        </p>
        <button
          type="button"
          onClick={onFindTutor}
          className="rounded-xl bg-[#5fa8ff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4a97f5]"
        >
          Find a tutor
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Re-book</h1>
        <p className="mt-1 text-sm text-muted">
          {tutors.length} tutor{tutors.length === 1 ? '' : 's'} you have booked before
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tutors.map((row) => (
          <TutorSearchCard
            key={`${row.tutorId}-${row.catalogOfferingId}`}
            hit={{
              tutorId: row.tutorId,
              displayName: row.displayName,
              photoUrl: row.photoUrl,
              totalExperienceMonths: row.totalExperienceMonths ?? undefined,
              offeringLabel: row.offeringLabel,
              matchingOfferingId: row.catalogOfferingId,
              rateInr: 0,
              deliveryModeShown: row.lastDeliveryMode,
              freeDemoOffered: false,
              hasAvailabilityThisWeek: false,
              groupSize: 1,
            }}
            bookedClassCount={row.totalClassCount}
            deliveryModeLabel={deliveryModeLabel(row.lastDeliveryMode)}
            onView={() =>
              onOpenTutorPreview(String(row.tutorId), String(row.catalogOfferingId))
            }
          />
        ))}
      </div>
    </div>
  );
};
