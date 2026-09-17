import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_DETAIL } from '@tutorix/shared-graphql';
import { TutorAvailabilitySection } from '@tutorix/tutor-availability-ui';
import type { TutorDetailRecord } from '@tutorix/tutor-detail-ui';

type MyTutorDetailData = {
  myTutorDetail?: TutorDetailRecord | null;
};

export const TutorCalendarPage: React.FC = () => {
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
      <TutorAvailabilitySection
        canSetAvailability={tutor.canSetAvailability === true}
        offerings={tutor.offerings}
        bankDetailsComplete={Boolean(tutor.user?.bankDetails?.isComplete)}
        defaultOpen
      />
    </div>
  );
};
