import React, { useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CONFIRM_PROFILE_PICTURE_UPLOAD,
  GET_MY_STUDENT_PROFILE,
  REQUEST_PROFILE_PICTURE_UPLOAD_URL,
} from '@tutorix/shared-graphql';
import type { WebUser } from '../../types/web-user';

type StudentHomePageProps = {
  currentUser?: WebUser | null;
};

function initialsFromName(first?: string, last?: string): string {
  const f = first?.trim()?.[0] ?? '';
  const l = last?.trim()?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

export const StudentHomePage: React.FC<StudentHomePageProps> = ({
  currentUser,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, refetch } = useQuery(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });

  const [requestUploadUrl] = useMutation(REQUEST_PROFILE_PICTURE_UPLOAD_URL);
  const [confirmUpload] = useMutation(CONFIRM_PROFILE_PICTURE_UPLOAD);

  const user = data?.myStudentProfile?.user;
  const firstName = user?.firstName ?? currentUser?.firstName;
  const lastName = user?.lastName ?? currentUser?.lastName;
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Student';
  const avatarUrl = user?.profilePicture ?? user?.profilePictureThumbnailMedium;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);

    const mimeType = file.type;
    if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
      setUploadError('Please choose a JPEG or PNG image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be 5 MB or smaller');
      return;
    }

    setUploading(true);
    try {
      const { data: urlData } = await requestUploadUrl({
        variables: {
          input: { mimeType, byteSize: file.size },
        },
      });
      const payload = urlData?.requestProfilePictureUploadUrl;
      if (!payload?.uploadUrl || !payload.storageKey) {
        throw new Error('Could not get upload URL');
      }

      const putRes = await fetch(payload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': payload.contentType },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error('Upload to storage failed');
      }

      await confirmUpload({
        variables: {
          input: {
            storageKey: payload.storageKey,
            mimeType,
            sizeBytes: file.size,
          },
        },
      });
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
