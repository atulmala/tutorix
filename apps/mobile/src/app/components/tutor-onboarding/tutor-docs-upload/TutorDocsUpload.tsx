import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import {
  pick,
  keepLocalCopy,
  types,
  errorCodes,
  isErrorWithCode,
} from '@react-native-documents/picker';
import {
  CONFIRM_TUTOR_DOCUMENT_UPLOAD,
  REQUEST_TUTOR_DOCUMENT_UPLOAD_URL,
} from '@tutorix/shared-graphql/mutations';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import type { StepComponentProps } from '@tutorix/shared-utils';
import { DocumentUploadCard } from './DocumentUploadCard';
import {
  ONBOARDING_SLOTS,
  type OnboardingDocType,
  type PickedFile,
} from './document-upload.types';
import {
  findSlotDoc,
  isImageMime,
  resolveMimeType,
  screeningHumanPending,
  screeningPassed,
  screeningRejected,
} from './document-upload.utils';
import { uploadTutorDocument } from './uploadTutorDocument';
import {
  CameraCaptureCanceled,
  captureDocumentImage,
} from './captureDocumentImage';

export const TutorDocsUpload: React.FC<StepComponentProps> = ({ onComplete }) => {
  const [slotError, setSlotError] = useState<
    Partial<Record<OnboardingDocType, string>>
  >({});
  const [uploadingSlot, setUploadingSlot] = useState<OnboardingDocType | null>(null);
  const [localPreviewUris, setLocalPreviewUris] = useState<
    Partial<Record<OnboardingDocType, string>>
  >({});

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

  const uploadFileForSlot = useCallback(
    async (slot: OnboardingDocType, file: PickedFile) => {
      setSlotError((prev) => ({ ...prev, [slot]: undefined }));

      const mimeType = resolveMimeType(file.name, file.type);
      if (isImageMime(mimeType)) {
        setLocalPreviewUris((prev) => ({ ...prev, [slot]: file.uri }));
      } else {
        setLocalPreviewUris((prev) => {
          const next = { ...prev };
          delete next[slot];
          return next;
        });
      }

      setUploadingSlot(slot);
      try {
        await uploadTutorDocument(slot, file, requestUploadUrl, confirmUpload);
        setLocalPreviewUris((prev) => {
          const next = { ...prev };
          delete next[slot];
          return next;
        });
      } catch (e: unknown) {
        const message =
          e instanceof Error
            ? e.message
            : 'Something went wrong. Please try again.';
        setSlotError((prev) => ({ ...prev, [slot]: message }));
        setLocalPreviewUris((prev) => {
          const next = { ...prev };
          delete next[slot];
          return next;
        });
      } finally {
        setUploadingSlot(null);
      }
    },
    [confirmUpload, requestUploadUrl],
  );

  const pickDocumentFile = useCallback(
    async (slot: OnboardingDocType) => {
      try {
        const [picked] = await pick({
          type: [types.pdf, types.images],
          allowMultiSelection: false,
        });
        if (!picked?.uri) return;

        const name = picked.name ?? 'document';
        const size = picked.size ?? 0;

        const [copyResult] = await keepLocalCopy({
          files: [
            {
              uri: picked.uri,
              fileName: name,
              convertVirtualFileToType: picked.isVirtual
                ? picked.convertibleToMimeTypes?.[0]?.mimeType
                : undefined,
            },
          ],
          destination: 'cachesDirectory',
        });

        if (copyResult.status !== 'success') {
          throw new Error(
            copyResult.status === 'error'
              ? copyResult.copyError
              : 'Could not read the selected file.',
          );
        }

        await uploadFileForSlot(slot, {
          uri: copyResult.localUri,
          name,
          size,
          type: picked.type ?? null,
        });
      } catch (e: unknown) {
        if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) return;
        const message =
          e instanceof Error
            ? e.message
            : 'Could not open file picker. Please try again.';
        setSlotError((prev) => ({ ...prev, [slot]: message }));
      }
    },
    [uploadFileForSlot],
  );

  const handleTakePhoto = useCallback(
    async (slot: OnboardingDocType) => {
      try {
        const file = await captureDocumentImage();
        await uploadFileForSlot(slot, file);
      } catch (e: unknown) {
        if (e instanceof CameraCaptureCanceled) return;
        const message =
          e instanceof Error
            ? e.message
            : 'Could not capture photo. Please try again.';
        setSlotError((prev) => ({ ...prev, [slot]: message }));
      }
    },
    [uploadFileForSlot],
  );

  const handleAddDocument = useCallback(
    (slot: OnboardingDocType) => {
      Alert.alert('Add document', 'How would you like to add this document?', [
        { text: 'Take photo', onPress: () => void handleTakePhoto(slot) },
        { text: 'Choose file', onPress: () => void pickDocumentFile(slot) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [handleTakePhoto, pickDocumentFile],
  );

  const continueDisabled = !progress.allPassed || profileLoading;

  const showReviewBanner =
    progress.allFilled && !progress.allPassed && !progress.anyRejected;

  const continueHint = !progress.allFilled
    ? 'Upload all four documents. Continue stays disabled until each document passes verification.'
    : progress.anyRejected
      ? 'One or more documents were not accepted. Replace those files and wait for verification again.'
      : continueDisabled
        ? 'Continue unlocks when all four documents have passed verification.'
        : 'All documents passed—you can continue.';

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        Upload each document below. You can replace a file anytime—we keep only the
        latest upload per document type.
      </Text>
      <Text style={styles.progressText}>
        {progress.filled} of {ONBOARDING_SLOTS.length} documents uploaded
        {showReviewBanner ? ' · Verification in progress' : ''}
      </Text>

      {showReviewBanner && (
        <View style={styles.reviewBanner}>
          <Text style={styles.reviewBannerText}>
            Your documents are under review and the process may take up to 24 hours.
            You will be notified when it is done!
          </Text>
        </View>
      )}

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
            localPreviewUri={localPreviewUris[slot.documentType]}
            err={err}
            busy={busy}
            profileLoading={profileLoading}
            onPickFile={() => handleAddDocument(slot.documentType)}
            passed={passed}
            rejected={rejected}
            humanPending={humanPending}
            awaitingBatch={awaitingBatch}
          />
        );
      })}

      <View style={styles.footer}>
        <Text style={styles.footerHint}>{continueHint}</Text>
        <TouchableOpacity
          style={[
            styles.continueButton,
            continueDisabled && styles.continueButtonDisabled,
          ]}
          onPress={onComplete}
          disabled={continueDisabled}
          activeOpacity={0.7}
        >
          {profileLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={[
                styles.continueButtonText,
                continueDisabled && styles.continueButtonTextDisabled,
              ]}
            >
              Continue
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  intro: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  reviewBanner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  reviewBannerText: {
    fontSize: 14,
    color: '#451a03',
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
    marginTop: 8,
    gap: 12,
  },
  footerHint: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  continueButton: {
    alignSelf: 'flex-end',
    minWidth: 120,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#5fa8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  continueButtonTextDisabled: {
    color: '#6b7280',
  },
});
