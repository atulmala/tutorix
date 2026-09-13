import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql';
import { useWebAuth } from '../../auth/useWebAuth';

export const TutorHomePage: React.FC = () => {
  const { user: currentUser } = useWebAuth();
  const { data } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });

  const user = data?.myTutorProfile?.user;
  const firstName = user?.firstName ?? currentUser?.firstName;
  const lastName = user?.lastName ?? currentUser?.lastName;
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Tutor';

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div className="rounded-2xl border border-primary/10 bg-white px-6 py-5 shadow-sm">
        <h1 className="text-2xl font-bold text-primary">Welcome, {displayName}</h1>
        <div className="mt-10 rounded-lg border border-dashed border-subtle bg-gray-50/50 p-6 text-center">
          <p className="text-sm text-muted">
            Manage bookings, students, and your teaching schedule — coming soon.
          </p>
        </div>
      </div>
    </div>
  );
};
