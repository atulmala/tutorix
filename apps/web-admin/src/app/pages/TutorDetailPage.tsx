import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { ADMIN_SET_TEST_TUTOR, GET_ADMIN_TUTOR_DETAIL } from '@tutorix/shared-graphql';
import { TutorDetailView, type TutorDetailRecord } from '@tutorix/tutor-detail-ui';

type AdminTutorDetailData = {
  adminTutorDetail: TutorDetailRecord;
};

export function TutorDetailPage() {
  const { tutorId } = useParams<{ tutorId: string }>();
  const parsedId = Number(tutorId);

  const { data, loading, error, refetch } = useQuery<AdminTutorDetailData>(
    GET_ADMIN_TUTOR_DETAIL,
    {
      variables: { tutorId: parsedId },
      skip: !Number.isFinite(parsedId),
      fetchPolicy: 'cache-and-network',
    },
  );

  const [setTestTutor, { loading: savingTestTutor }] = useMutation(ADMIN_SET_TEST_TUTOR, {
    onCompleted: () => refetch(),
  });

  const tutor = data?.adminTutorDetail;

  if (!Number.isFinite(parsedId)) {
    return <p className="text-sm text-red-600">Invalid tutor ID.</p>;
  }

  if (loading && !tutor) {
    return (
      <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-8 text-center">
        <p className="text-sm font-medium text-sky-800">Loading tutor details…</p>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div>
        <Link to="/tutors" className="text-sm font-medium text-sky-700 hover:underline">
          ← Back to tutors
        </Link>
        <p className="mt-4 text-sm text-red-600" role="alert">
          Could not load tutor details.
        </p>
      </div>
    );
  }

  return (
    <TutorDetailView
      mode="admin"
      tutor={tutor}
      savingTestTutor={savingTestTutor}
      onTestTutorChange={(testTutor) => {
        void setTestTutor({
          variables: { tutorId: tutor.id, testTutor },
        });
      }}
      onDocumentReviewComplete={() => void refetch()}
      headerAddon={
        <Link
          to="/tutors"
          className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-3 py-1 text-sm font-semibold text-sky-800 ring-1 ring-sky-200 transition hover:bg-sky-50"
        >
          ← Back to tutors
        </Link>
      }
    />
  );
}
