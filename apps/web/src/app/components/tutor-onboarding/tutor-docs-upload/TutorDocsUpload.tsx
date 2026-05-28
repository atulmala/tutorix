import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  COMPLETE_DOCS_STEP,
  CONFIRM_TUTOR_DOCUMENT_UPLOAD,
  GET_MY_TUTOR_PROFILE,
  REQUEST_TUTOR_DOCUMENT_UPLOAD_URL,
} from '@tutorix/shared-graphql';
import type { StepComponentProps } from '../types';
import { DocumentUploadCard } from './DocumentUploadCard';

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

type OnboardingDocType =
  | 'AADHAAR_CARD'
  | 'PAN_CARD'
  | 'CLASS_XII_MARKSHEET'
  | 'HIGHEST_DEGREE_CERTIFICATE';

type SlotDoc = {
  filename?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
  previewUrl?: string | null;
  verificationWorkflowStatus?: string | null;
  screening?: { status?: string | null; summaryNotes?: string | null } | null;
};

const ONBOARDING_SLOTS: {
  documentType: OnboardingDocType;
  title: string;
  description: string;
}[] = [
  {
    documentType: 'AADHAAR_CARD',
    title: 'Aadhaar card',
    description: 'Front side (PDF, JPG, or PNG, max 10 MB).',
  },
  {
    documentType: 'PAN_CARD',
    title: 'PAN card',
    description: 'Income Tax PAN (PDF, JPG, or PNG, max 10 MB).',
  },
  {
    documentType: 'CLASS_XII_MARKSHEET',
    title: 'Higher secondary (Class XII)',
    description: 'Marksheet or certificate (PDF, JPG, or PNG, max 10 MB).',
  },
  {
    documentType: 'HIGHEST_DEGREE_CERTIFICATE',
    title: 'Highest degree',
    description: 'Degree certificate or transcript (PDF, JPG, or PNG, max 10 MB).',
  },
];

function resolveMimeType(file: File): string {
  if (file.type && ALLOWED_MIME.has(file.type)) {
    return file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return file.type || '';
}

function normalizeDocumentType(raw: unknown): string | undefined {
  if (typeof raw === 'string') return raw;
  return undefined;
}

function findSlotDoc(
  documents: Array<{ documentType?: unknown }> | undefined,
  slot: OnboardingDocType,
): SlotDoc | undefined {
  const raw = documents?.find((d) => normalizeDocumentType(d.documentType) === slot);
  return raw as SlotDoc | undefined;
}

function screeningPassed(screening: SlotDoc['screening']): boolean {
  const s = screening?.status;
  return s === 'PASSED_AUTOMATED' || s === 'APPROVED_HUMAN';
}

function screeningRejected(screening: SlotDoc['screening']): boolean {
  return screening?.status === 'REJECTED_HUMAN';
}

function screeningHumanPending(screening: SlotDoc['screening']): boolean {
  return screening?.status === 'PENDING_HUMAN';
}

export const TutorDocsUpload: React.FC<StepComponentProps> = () => {
  const inputRefs = useRef<Record<OnboardingDocType, HTMLInputElement | null>>({
    AADHAAR_CARD: null,
    PAN_CARD: null,
    CLASS_XII_MARKSHEET: null,
    HIGHEST_DEGREE_CERTIFICATE: null,
  });

  const [slotError, setSlotError] = useState<Partial<Record<OnboardingDocType, string>>>(
    {},
  );
  const [uploadingSlot, setUploadingSlot] = useState<OnboardingDocType | null>(null);
  const [optimisticPreviewUrls, setOptimisticPreviewUrls] = useState<
    Partial<Record<OnboardingDocType, string>>
  >({});

  const optimisticPreviewUrlsRef = useRef(optimisticPreviewUrls);
  optimisticPreviewUrlsRef.current = optimisticPreviewUrls;

  useEffect(() => {
    return () => {
      for (const url of Object.values(optimisticPreviewUrlsRef.current)) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, []);

  const { data: profileData, loading: profileLoading } = useQuery(
    GET_MY_TUTOR_PROFILE,
    { fetchPolicy: 'cache-and-network' },
  );

  const documents = profileData?.myTutorProfile?.documents;

  const [requestUploadUrl] = useMutation(REQUEST_TUTOR_DOCUMENT_UPLOAD_URL);
  const [confirmUpload] = useMutation(CONFIRM_TUTOR_DOCUMENT_UPLOAD, {
    refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
    awaitRefetchQueries: true,
  });
  const [completeDocsStep, { loading: completingDocs }] = useMutation(
    COMPLETE_DOCS_STEP,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
    },
  );
  const [continueError, setContinueError] = useState<string | null>(null);

  const progress = useMemo(() => {
    let filled = 0;
    let anyRejected = false;
    let allPassed = true;

    for (const s of ONBOARDING_SLOTS) {
      const d = findSlotDoc(documents, s.documentType);
      const hasFile = Boolean(d?.storageKey);
      if (hasFile) filled += 1;
      else allPassed = false;

      if (hasFile) {
        if (screeningRejected(d?.screening)) {
          anyRejected = true;
          allPassed = false;
        } else if (!screeningPassed(d?.screening)) {
          allPassed = false;
        }
      }
    }

    const allFilled = filled === ONBOARDING_SLOTS.length;

    return { filled, allFilled, allPassed, anyRejected };
  }, [documents]);

  const setOptimisticPreviewForSlot = useCallback(
    (slot: OnboardingDocType, file: File | null) => {
      setOptimisticPreviewUrls((prev) => {
        const existing = prev[slot];
        if (existing) URL.revokeObjectURL(existing);

        if (!file) {
          const next = { ...prev };
          delete next[slot];
          return next;
        }

        const mime = resolveMimeType(file);
        if (mime !== 'image/jpeg' && mime !== 'image/png') {
          const next = { ...prev };
          delete next[slot];
          return next;
        }

        return { ...prev, [slot]: URL.createObjectURL(file) };
      });
    },
    [],
  );

  const uploadFileForSlot = useCallback(
    async (slot: OnboardingDocType, file: File) => {
      setSlotError((prev) => ({ ...prev, [slot]: undefined }));
      const mimeType = resolveMimeType(file);
      if (!ALLOWED_MIME.has(mimeType)) {
        setSlotError((prev) => ({
          ...prev,
          [slot]: 'Please upload a PDF, JPG, or PNG file.',
        }));
        return;
      }
      if (file.size < 1 || file.size > MAX_BYTES) {
        setSlotError((prev) => ({
          ...prev,
          [slot]: `File must be between 1 byte and ${MAX_BYTES / (1024 * 1024)} MB.`,
        }));
        return;
      }

      setOptimisticPreviewForSlot(slot, file);
      setUploadingSlot(slot);
      try {
        const { data: urlData } = await requestUploadUrl({
          variables: {
            input: {
              documentType: slot,
              mimeType,
              byteSize: file.size,
              originalFilename: file.name,
            },
          },
        });
        const payload = urlData?.requestTutorDocumentUploadUrl;
        if (!payload?.uploadUrl || !payload.storageKey || !payload.contentType) {
          throw new Error('Could not start upload. Please try again.');
        }

        const putRes = await fetch(payload.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': payload.contentType,
          },
          body: file,
        });
        if (!putRes.ok) {
          throw new Error(
            `Upload failed (${putRes.status}). Check your connection and try again.`,
          );
        }

        await confirmUpload({
          variables: {
            input: {
              documentType: slot,
              storageKey: payload.storageKey,
              mimeType,
              sizeBytes: file.size,
              originalFilename: file.name,
            },
          },
        });
        setOptimisticPreviewForSlot(slot, null);
      } catch (e: unknown) {
        const message =
          e instanceof Error
            ? e.message
            : 'Something went wrong. Please try again.';
        setSlotError((prev) => ({ ...prev, [slot]: message }));
      } finally {
        setUploadingSlot(null);
        const el = inputRefs.current[slot];
        if (el) el.value = '';
      }
    },
    [confirmUpload, requestUploadUrl, setOptimisticPreviewForSlot],
  );

  const handlePickFile = useCallback(
    (slot: OnboardingDocType, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      void uploadFileForSlot(slot, file);
    },
    [uploadFileForSlot],
  );

  const continueDisabled =
    !progress.allPassed || profileLoading || completingDocs;

  const handleContinue = async () => {
    setContinueError(null);
    try {
      await completeDocsStep();
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : 'Could not advance to application review. Try again.';
      setContinueError(message);
    }
  };

  const showReviewBanner =
    progress.allFilled && !progress.allPassed && !progress.anyRejected;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted">
          Upload each document below. You can replace a file anytime—we keep only the
          latest upload per document type.
        </p>
        <p className="mt-2 text-sm text-muted">
          {progress.filled} of {ONBOARDING_SLOTS.length} documents uploaded
          {showReviewBanner ? ' · Verification in progress' : ''}
        </p>
      </div>

      {showReviewBanner && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Your documents are under review and the process may take up to 24 hours. You
          will be notified when it is done!
        </div>
      )}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ONBOARDING_SLOTS.map((slot) => {
          const doc = findSlotDoc(documents, slot.documentType);
          const hasFile = Boolean(doc?.storageKey);
          const err = slotError[slot.documentType];
          const busy = uploadingSlot === slot.documentType;
          const passed = hasFile && screeningPassed(doc?.screening);
          const rejected = hasFile && screeningRejected(doc?.screening);
          const humanPending = hasFile && screeningHumanPending(doc?.screening);
          const awaitingBatch =
            hasFile &&
            doc?.verificationWorkflowStatus === 'PENDING' &&
            !doc?.screening;

          return (
            <DocumentUploadCard
              key={slot.documentType}
              slot={slot}
              doc={doc}
              optimisticPreviewUrl={optimisticPreviewUrls[slot.documentType]}
              err={err}
              busy={busy}
              profileLoading={profileLoading}
              inputRef={(el) => {
                inputRefs.current[slot.documentType] = el;
              }}
              onPickFile={(e) => handlePickFile(slot.documentType, e)}
              passed={passed}
              rejected={rejected}
              humanPending={humanPending}
              awaitingBatch={awaitingBatch}
            />
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-6">
        <div className="text-sm text-muted">
          <p>
            {!progress.allFilled
              ? 'Upload all four documents. Continue stays disabled until each document passes verification.'
              : progress.anyRejected
                ? 'One or more documents were not accepted. Replace those files and wait for verification again.'
                : continueDisabled
                  ? 'Continue unlocks when all four documents have passed verification.'
                  : 'All documents passed—you can continue.'}
          </p>
          {continueError ? (
            <p className="mt-2 text-red-600" role="alert">
              {continueError}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleContinue()}
            disabled={continueDisabled}
            className={`h-11 rounded-lg px-6 text-sm font-semibold text-white shadow-sm transition ${
              continueDisabled
                ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                : 'bg-[#5fa8ff] hover:bg-[#4a97f5]'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
