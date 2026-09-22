import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_DETAIL } from '@tutorix/shared-graphql';
import { TutorAvailabilitySection } from '@tutorix/tutor-availability-ui';
import type { TutorDetailRecord } from '@tutorix/tutor-detail-ui';

type MyTutorDetailData = {
  myTutorDetail?: TutorDetailRecord | null;
};

type TutorCalendarPageProps = {
  onSetupComplete?: () => void;
};

export const TutorCalendarPage: React.FC<TutorCalendarPageProps> = ({
  onSetupComplete,
}) => {
  const { data, loading, error } = useQuery<MyTutorDetailData>(GET_MY_TUTOR_DETAIL, {
    fetchPolicy: 'cache-and-network',
  });
  const tutor = data?.myTutorDetail;

  if (loading && !tutor) {
    return <p className="text-sm text-slate-500">Loading calendar…</p>;
  }
  if (error || !tutor) {
    return (
      <p className="text-sm text-red-600" role="alert">
        Could not load your calendar.
      </p>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      {!tutor.availabilityConfiguredAt ? (
        <p className="mb-4 text-sm text-slate-600">
          Set your usual weekly hours once. We apply them to all upcoming weeks; you can
          change them anytime.
        </p>
      ) : null}
      <TutorAvailabilitySection
        canSetAvailability={tutor.canSetAvailability === true}
        offerings={tutor.offerings}
        bankDetailsComplete={Boolean(tutor.user?.bankDetails?.isComplete)}
        defaultOpen
        onSaved={onSetupComplete}
      />
    </div>
  );
};
