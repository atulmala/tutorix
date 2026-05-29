import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_DETAIL } from '@tutorix/shared-graphql';
import { TutorDetailView, type TutorDetailRecord } from '@tutorix/tutor-detail-ui';

type MyTutorDetailData = {
  myTutorDetail: TutorDetailRecord;
};

export const TutorProfilePage: React.FC = () => {
  const { data, loading, error } = useQuery<MyTutorDetailData>(GET_MY_TUTOR_DETAIL, {
    fetchPolicy: 'cache-and-network',
  });

  const tutor = data?.myTutorDetail;

  if (loading && !tutor) {
    return (
      <div className="w-full max-w-5xl rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-8 text-center">
        <p className="text-sm font-medium text-sky-800">Loading your profile…</p>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="w-full max-w-4xl rounded-2xl border border-subtle bg-white p-8 shadow-lg">
        <p className="text-sm text-red-600" role="alert">
          Could not load your tutor profile.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
      <p className="mb-4 text-sm text-muted">Your tutor profile</p>
      <TutorDetailView mode="tutor" tutor={tutor} />
    </div>
  );
};
