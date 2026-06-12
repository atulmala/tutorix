import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  CONFIRM_PROFILE_PICTURE_UPLOAD,
  GET_CURRENT_USER,
  GET_MY_STUDENT_PROFILE,
  GET_MY_TUTOR_DETAIL,
  REQUEST_PROFILE_PICTURE_UPLOAD_URL,
} from '@tutorix/shared-graphql';
import type { WebUser } from '../types/web-user';
import {
  profilePictureAvatarUrl,
  uploadProfilePictureFile,
  type ProfilePictureUploadResult,
} from '../lib/uploadProfilePicture';

type HeaderProfileAvatarProps = {
  user: Pick<WebUser, 'firstName' | 'lastName'> & {
    profilePicture?: string | null;
    profilePictureThumbnailMedium?: string | null;
  };
  onUploadComplete?: (updated: ProfilePictureUploadResult) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  errorAlign?: 'left' | 'right';
  /** While true and no URL yet, shows loading inside the circle */
  userLoading?: boolean;
  /** Shown below the circle when no profile picture is set */
  emptyHint?: string;
};

const sizeClasses = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg border-2',
  xl: 'h-24 w-24 text-2xl border-2',
} as const;

const emptyLabelClasses = {
  sm: 'px-0.5 text-[8px] leading-tight',
  md: 'px-0.5 text-[9px] leading-tight',
  lg: 'px-1 text-xs leading-snug',
  xl: 'px-2 text-sm leading-snug',
} as const;

type ImageStatus = 'idle' | 'loading' | 'loaded' | 'error';

export const HeaderProfileAvatar: React.FC<HeaderProfileAvatarProps> = ({
  user,
  onUploadComplete,
  size = 'sm',
  errorAlign = 'right',
  userLoading = false,
  emptyHint,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<ImageStatus>('idle');

  const [requestUploadUrl] = useMutation(REQUEST_PROFILE_PICTURE_UPLOAD_URL);
  const [confirmUpload] = useMutation(CONFIRM_PROFILE_PICTURE_UPLOAD, {
    refetchQueries: [
      { query: GET_CURRENT_USER },
      { query: GET_MY_STUDENT_PROFILE },
      { query: GET_MY_TUTOR_DETAIL },
    ],
  });

  const avatarUrl = profilePictureAvatarUrl(user);
  const dimensionClass = sizeClasses[size];
  const emptyLabelClass = emptyLabelClasses[size];

  useEffect(() => {
    if (!avatarUrl) {
      setImageStatus('idle');
      return;
    }
    setImageStatus('loading');
  }, [avatarUrl]);

  const hasAvatarUrl = Boolean(avatarUrl) && imageStatus !== 'error';
  const showImageLoading = hasAvatarUrl && imageStatus === 'loading';
  const showUserLoading = userLoading && !hasAvatarUrl;
  const showLoadingLabel = uploading || showUserLoading || showImageLoading;
  const showEmptyUpload = !hasAvatarUrl && !showLoadingLabel;
  const showImage = hasAvatarUrl && imageStatus === 'loaded';

  const circleLabel = showLoadingLabel ? 'loading...' : showEmptyUpload ? 'upload pic' : null;

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
      onUploadComplete?.(updated);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to upload profile picture',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setUploadError(null);
          fileInputRef.current?.click();
        }}
        disabled={uploading}
        className={`group relative shrink-0 overflow-hidden rounded-full border border-subtle bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#5fa8ff] disabled:opacity-60 ${dimensionClass}`}
        aria-label="Upload profile picture"
        aria-describedby={uploadError ? 'header-avatar-upload-error' : undefined}
        title={
          showLoadingLabel
            ? 'Loading profile picture'
            : hasAvatarUrl
              ? 'Change profile picture'
              : 'Upload profile picture'
        }
      >
        {hasAvatarUrl && avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className={`h-full w-full object-cover ${showImage ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageStatus('loaded')}
            onError={() => setImageStatus('error')}
          />
        ) : null}
        {circleLabel ? (
          <span
            className={`absolute inset-0 flex items-center justify-center text-center font-semibold text-primary/70 ${emptyLabelClass}`}
          >
            {circleLabel}
          </span>
        ) : null}
        {showImage ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100 group-disabled:opacity-100">
            {uploading ? 'loading...' : 'Change'}
          </span>
        ) : null}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
      />
      {!hasAvatarUrl && !showLoadingLabel && emptyHint ? (
        <p
          className={`text-center text-[10px] leading-snug text-muted ${
            size === 'xl' ? 'max-w-[9rem]' : 'max-w-[6.5rem]'
          }`}
        >
          {emptyHint}
        </p>
      ) : null}
      {uploadError ? (
        <div
          id="header-avatar-upload-error"
          role="alert"
          aria-live="polite"
          className={`absolute top-full z-50 mt-2 w-72 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 shadow-lg ${
            errorAlign === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm leading-snug text-red-700">{uploadError}</p>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="shrink-0 rounded p-0.5 text-sm leading-none text-red-500 transition hover:bg-red-100 hover:text-red-700"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
