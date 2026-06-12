import React, { useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CONFIRM_PROFILE_PICTURE_UPLOAD,
  GET_MY_STUDENT_PROFILE,
  REQUEST_PROFILE_PICTURE_UPLOAD_URL,
} from '@tutorix/shared-graphql';
import type { WebUser } from '../../types/web-user';
import {
  initialsFromName,
  profilePictureAvatarUrl,
  uploadProfilePictureFile,
} from '../../lib/uploadProfilePicture';
import { useWebAuth } from '../../auth/useWebAuth';

type StudentHomePageProps = {
  currentUser?: WebUser | null;
};

export const StudentHomePage: React.FC<StudentHomePageProps> = ({
  currentUser,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { setUser } = useWebAuth();

  const { data, refetch } = useQuery(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });

  const [requestUploadUrl] = useMutation(REQUEST_PROFILE_PICTURE_UPLOAD_URL);
  const [confirmUpload] = useMutation(CONFIRM_PROFILE_PICTURE_UPLOAD);

  const user = data?.myStudentProfile?.user;
  const firstName = user?.firstName ?? currentUser?.firstName;
  const lastName = user?.lastName ?? currentUser?.lastName;
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Student';
  const avatarUrl = profilePictureAvatarUrl(user ?? currentUser);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    try {
      const updated = await uploadProfilePictureFile(
        file,
        async (options) => {
          const result = await requestUploadUrl(options);
          return { data: result.data };
        },
        async (options) => {
          const result = await confirmUpload(options);
          return { data: result.data };
        },
      );
      setUser((prev) =>
        prev
          ? {
              ...prev,
              profilePicture: updated.profilePicture,
              profilePictureThumbnailMedium: updated.profilePictureThumbnailMedium,
              profilePictureThumbnailLarge: updated.profilePictureThumbnailLarge,
              profilePictureOriginalUrl: updated.profilePictureOriginalUrl,
            }
          : prev,
      );
      await refetch();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to upload profile picture',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-subtle bg-white p-8 shadow-lg">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-subtle bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#5fa8ff]"
          aria-label="Upload profile picture"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary/60">
              {initialsFromName(firstName, lastName)}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
            {uploading ? 'Uploading…' : 'Change'}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-primary">Welcome, {displayName}</h1>
          <p className="mt-2 text-sm text-muted">
            Your student profile is ready. Add a profile photo so tutors can recognize you.
          </p>
          {!avatarUrl && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-4 text-sm font-medium text-[#5fa8ff] hover:underline disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Add profile photo'}
            </button>
          )}
          {uploadError && (
            <p className="mt-2 text-sm text-danger">{uploadError}</p>
          )}
        </div>
      </div>

      <div className="mt-10 rounded-lg border border-dashed border-subtle bg-gray-50/50 p-6 text-center">
        <p className="text-sm text-muted">
          Find tutors, book sessions, and track your learning — coming soon.
        </p>
      </div>
    </div>
  );
};
