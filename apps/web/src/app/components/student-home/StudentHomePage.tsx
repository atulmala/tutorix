import React, { useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CURRENT_USER, GET_MY_STUDENT_PROFILE } from '@tutorix/shared-graphql';
import { formatDate } from '@tutorix/shared-utils';
import { useWebAuth } from '../../auth/useWebAuth';
import { HeaderProfileAvatar } from '../HeaderProfileAvatar';
import type { WebUser } from '../../types/web-user';

type CurrentUserData = {
  me: WebUser & {
    mobileCountryCode?: string | null;
    mobileNumber?: string | null;
    createdDate?: string | null;
  };
};

type StudentProfileData = {
  myStudentProfile: {
    id: number;
    onboardingStage?: string | null;
    onBoardingComplete?: boolean | null;
    user?: {
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  } | null;
};

function formatStudentName(first?: string | null, last?: string | null): string {
  return [first, last].filter(Boolean).join(' ') || 'Student';
}

function formatContactLine(user?: CurrentUserData['me'] | null): string {
  if (!user) return '';
  const parts: string[] = [];
  const mobile = [user.mobileCountryCode, user.mobileNumber].filter(Boolean).join('');
  if (mobile) parts.push(mobile);
  if (user.email) parts.push(user.email);
  if (user.createdDate) parts.push(`Registered ${formatDate(user.createdDate)}`);
  return parts.join(' · ');
}

export const StudentHomePage: React.FC = () => {
  const { user: currentUser, refreshUser } = useWebAuth();
  const { data: meData, loading: meLoading } = useQuery<CurrentUserData>(GET_CURRENT_USER, {
    fetchPolicy: 'network-only',
    skip: !currentUser,
  });
  const avatarUser = meData?.me ?? currentUser;
  const profileUser = meData?.me ?? currentUser;

  const { data, loading, error } = useQuery<StudentProfileData>(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });

  const student = data?.myStudentProfile;

  const handleProfilePictureUpload = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  if (loading && !student) {
    return (
      <div className="w-full max-w-5xl rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-8 text-center">
        <p className="text-sm font-medium text-sky-800">Loading your profile…</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="w-full max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-700">Could not load your student profile.</p>
      </div>
    );
  }

  const displayName = formatStudentName(
    student.user?.firstName ?? profileUser?.firstName,
    student.user?.lastName ?? profileUser?.lastName,
  );

  return (
    <div className="w-full max-w-5xl space-y-6">
      <p className="text-sm text-muted">Your student profile</p>

      <div className="overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-sky-100/80 via-white to-violet-100/80 px-6 py-5 shadow-md shadow-sky-100/30">
        <div className="flex items-center gap-5">
          {avatarUser ? (
            <div className="shrink-0">
              <HeaderProfileAvatar
                user={avatarUser}
                userLoading={meLoading && !meData?.me}
                onUploadComplete={handleProfilePictureUpload}
                size="xl"
                errorAlign="left"
                emptyHint="students with profile pic are easier for tutors to recognize!"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-primary">{displayName}</h1>
              <span className="rounded-full bg-sky-500 px-3 py-0.5 text-sm font-bold text-white shadow-sm">
                #{student.id}
              </span>
              {student.onboardingStage ? (
                <span className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                  {student.onboardingStage}
                </span>
              ) : null}
            </div>
            {profileUser ? (
              <p className="mt-2 text-sm text-muted">{formatContactLine(profileUser)}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-subtle bg-gray-50/50 p-6 text-center">
        <p className="text-sm text-muted">
          Find tutors, book sessions, and track your learning — coming soon.
        </p>
      </div>
    </div>
  );
};
