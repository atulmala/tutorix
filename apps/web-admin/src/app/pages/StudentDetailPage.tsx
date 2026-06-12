import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_ADMIN_STUDENT_DETAIL } from '@tutorix/shared-graphql';
import { StudentDetailView, type StudentDetailRecord } from '@tutorix/student-detail-ui';

type AdminStudentDetailData = {
  adminStudentDetail: StudentDetailRecord;
};

export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const parsedId = Number(studentId);

  const { data, loading, error } = useQuery<AdminStudentDetailData>(
    GET_ADMIN_STUDENT_DETAIL,
    {
      variables: { studentId: parsedId },
      skip: !Number.isFinite(parsedId),
      fetchPolicy: 'cache-and-network',
    },
  );

  const student = data?.adminStudentDetail;

  if (!Number.isFinite(parsedId)) {
    return <p className="text-sm text-red-600">Invalid student ID.</p>;
  }

  if (loading && !student) {
    return (
      <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-8 text-center">
        <p className="text-sm font-medium text-sky-800">Loading student details…</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div>
        <Link to="/students" className="text-sm font-medium text-sky-700 hover:underline">
          ← Back to students
        </Link>
        <p className="mt-4 text-sm text-red-600" role="alert">
          Could not load student details.
        </p>
      </div>
    );
  }

  return (
    <StudentDetailView
      student={student}
      headerAddon={
        <Link
          to="/students"
          className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-3 py-1 text-sm font-semibold text-sky-800 ring-1 ring-sky-200 transition hover:bg-sky-50"
        >
          ← Back to students
        </Link>
      }
    />
  );
}
