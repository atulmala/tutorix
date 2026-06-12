import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
  Linking,
  useWindowDimensions,
  Alert,
} from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { useMutation, useQuery } from '@apollo/client';
import { GET_MY_TUTOR_DETAIL } from '@tutorix/shared-graphql/queries';
import {
  CONFIRM_PROFILE_PICTURE_UPLOAD,
  CREATE_TUTOR_ADDRESS,
  REQUEST_PROFILE_PICTURE_UPLOAD_URL,
  SAVE_MY_BANK_DETAILS,
  SAVE_MY_TUTOR_OFFERING_RATE_CARD,
  SAVE_TUTOR_EXPERIENCES,
  SAVE_TUTOR_QUALIFICATIONS,
} from '@tutorix/shared-graphql/mutations';
import {
  buildOnboardingTimeline,
  buildExperienceMutationInput,
  buildQualificationMutationInput,
  canDeleteQualificationType,
  BANK_DETAILS_REQUIRED_FOR_RATE_CARD_MESSAGE,
  documentStatusLabel,
  EDUCATIONAL_QUALIFICATION_LABELS,
  EducationalQualification,
  emptyExperienceRow,
  emptyQualificationRow,
  experienceDurationMonths,
  formatDate,
  formatDateTime,
  formatExperienceDuration,
  formatQualificationTitle,
  getAvailableQualificationTypes,
  mapExperienceToFormRow,
  mapQualificationToFormRow,
  monthsToExperienceDuration,
  normalizeYearsOfExperience,
  sortQualificationsHighestFirst,
  sumExperienceDurations,
  formatOfferingLabelForDisplay,
  ptStatusLabel,
  sortTutorOfferingsForDisplay,
  profilePictureAvatarUrl,
  initialsFromProfileName,
  type ExperienceFormRow,
  type OnboardingTimelineEntry,
  type QualificationFormRow,
} from '@tutorix/shared-utils';
import type {
  BankDetailsFormValues,
  RateCardFormValues,
  TutorDetailRecord,
} from '@tutorix/tutor-detail-ui';
import { BankDetailsSection } from './BankDetailsSection';
import { BankDetailsModal } from './BankDetailsModal';
import { RateCardModal } from './RateCardModal';
import { ExperienceModal } from './ExperienceModal';
import { QualificationModal } from './QualificationModal';
import { TutorAvailabilitySection } from './TutorAvailabilitySection';
import { AddOfferingFlow } from './AddOfferingFlow';
import { TutorPT } from '../tutor-onboarding/tutor-pt/TutorPT';
import { AddressModal, type AddressFormValues } from './AddressModal';
import {
  uploadProfilePicture,
} from '../student-home/uploadProfilePicture';
import {
  ProfilePicturePickCanceled,
  promptProfilePictureSource,
} from '../student-home/pickProfilePictureImage';

type TutorOffering = TutorDetailRecord['offerings'][number];

type MyTutorDetailData = {
  myTutorDetail: TutorDetailRecord;
};

type TutorDocumentDetail = TutorDetailRecord['documents'][number];

function formatMobile(user?: TutorDetailRecord['user']): string {
  if (!user) return '—';
  if (user.mobile?.trim()) return user.mobile.trim();
  if (user.mobileNumber?.trim()) {
    const code = user.mobileCountryCode?.trim() || '+91';
    return `${code} ${user.mobileNumber.trim()}`;
  }
  return '—';
}

function formatAddress(address: TutorDetailRecord['addresses'][0]): string {
  if (address.fullAddress?.trim()) return address.fullAddress.trim();
  return [address.street, address.subArea, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(', ');
}

function timelineStatusColor(status: OnboardingTimelineEntry['status']): string {
  switch (status) {
    case 'completed':
      return '#10b981';
    case 'current':
      return '#0ea5e9';
    case 'skipped':
      return '#f59e0b';
    default:
      return '#cbd5e1';
  }
}

function formatEntryCount(count: number, singular: string, plural: string): string {
  if (count === 1) return `1 ${singular}`;
  return `${count} ${plural}`;
}

function PenIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth={2}>
      <Path d="M12 20h9" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2}>
      <Path d="M3 6h18" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="10" x2="10" y1="11" y2="17" strokeLinecap="round" />
      <Line x1="14" x2="14" y1="11" y2="17" strokeLinecap="round" />
    </Svg>
  );
}

function RateCardIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth={2}>
      <Path d="M6 2h9l5 5v15H6z" strokeLinejoin="round" />
      <Path d="M15 2v5h5" strokeLinejoin="round" />
      <SvgText
        x="12"
        y="17"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#047857"
        stroke="none"
      >
        ₹
      </SvgText>
    </Svg>
  );
}

function OfferingDetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.offeringField}>
      <Text style={styles.offeringFieldLabel}>{label}</Text>
      <Text style={styles.offeringFieldValue}>{value ?? '—'}</Text>
    </View>
  );
}

function formatTimelineDate(entry: OnboardingTimelineEntry): string {
  if (entry.status === 'skipped') return 'Payment skipped';
  if (entry.completedAt) return formatDateTime(entry.completedAt);
  if (entry.status === 'current') return 'In progress';
  return '—';
}

function DocumentViewerModal({
  document,
  onClose,
}: {
  document: TutorDocumentDetail;
  onClose: () => void;
}) {
  const isPdf = document.mimeType?.includes('pdf');
  const viewerUrl = isPdf ? document.viewUrl : document.previewUrl ?? document.viewUrl;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{document.name ?? 'Document'}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.docStatus}>
            {documentStatusLabel(document.screening?.status)}
          </Text>
          {viewerUrl && !isPdf ? (
            <Image source={{ uri: viewerUrl }} style={styles.modalImage} resizeMode="contain" />
          ) : viewerUrl ? (
            <TouchableOpacity
              style={styles.openPdfButton}
              onPress={() => void Linking.openURL(viewerUrl)}
            >
              <Text style={styles.openPdfText}>Open document</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.muted}>Preview unavailable.</Text>
          )}
          {document.screening?.summaryNotes ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>AI screening notes</Text>
              <Text style={styles.noteText}>{document.screening.summaryNotes}</Text>
            </View>
          ) : null}
          {document.screening?.reviewerNote ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Reviewer note</Text>
              <Text style={styles.noteText}>{document.screening.reviewerNote}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export const TutorDetailScreen: React.FC = () => {
  const { data, loading, error, refetch } = useQuery<MyTutorDetailData>(GET_MY_TUTOR_DETAIL, {
    fetchPolicy: 'cache-and-network',
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [requestUploadUrl] = useMutation(REQUEST_PROFILE_PICTURE_UPLOAD_URL);
  const [confirmUpload] = useMutation(CONFIRM_PROFILE_PICTURE_UPLOAD);
  const [selectedDocument, setSelectedDocument] = useState<TutorDocumentDetail | null>(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressSaveError, setAddressSaveError] = useState<string | null>(null);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [bankDetailsSaveError, setBankDetailsSaveError] = useState<string | null>(null);
  const [rateCardOffering, setRateCardOffering] = useState<TutorOffering | null>(null);
  const [rateCardSaveError, setRateCardSaveError] = useState<string | null>(null);
  const [showAddOffering, setShowAddOffering] = useState(false);
  const [ptOffering, setPtOffering] = useState<TutorOffering | null>(null);
  const [expandedOfferingId, setExpandedOfferingId] = useState<number | null>(null);
  const [experienceModal, setExperienceModal] = useState<
    { mode: 'edit' | 'add'; experienceId?: number } | null
  >(null);
  const [deletingExperienceId, setDeletingExperienceId] = useState<number | null>(null);
  const [experienceSaveError, setExperienceSaveError] = useState<string | null>(null);
  const [qualificationModal, setQualificationModal] = useState<
    { mode: 'edit' | 'add'; qualificationType: EducationalQualification } | null
  >(null);
  const [qualificationTypePickerOpen, setQualificationTypePickerOpen] = useState(false);
  const [deletingQualificationType, setDeletingQualificationType] =
    useState<EducationalQualification | null>(null);
  const [qualificationSaveError, setQualificationSaveError] = useState<string | null>(null);

  const [saveAddress, { loading: savingAddress }] = useMutation(CREATE_TUTOR_ADDRESS);
  const [saveBankDetails, { loading: savingBankDetails }] = useMutation(SAVE_MY_BANK_DETAILS);
  const [saveRateCard, { loading: savingRateCard }] = useMutation(SAVE_MY_TUTOR_OFFERING_RATE_CARD);
  const [saveExperiences, { loading: savingExperiences }] = useMutation(SAVE_TUTOR_EXPERIENCES);
  const [saveQualifications, { loading: savingQualifications }] = useMutation(
    SAVE_TUTOR_QUALIFICATIONS,
  );
  const { width: windowWidth } = useWindowDimensions();
  const stackProfileSections = windowWidth < 768;
  const offeringFieldsInRow = windowWidth >= 400;

  const toggleOfferingPtDetails = useCallback((offeringId: number) => {
    setExpandedOfferingId((current) => (current === offeringId ? null : offeringId));
  }, []);

  const tutor = data?.myTutorDetail;
  const bankDetailsComplete = Boolean(tutor?.user?.bankDetails?.isComplete);
  const avatarUrl = profilePictureAvatarUrl(tutor?.user);

  const handlePickProfilePhoto = async () => {
    setUploadError(null);
    try {
      const file = await promptProfilePictureSource();
      if (!file.size) {
        setUploadError('Could not read image size. Please try another photo.');
        return;
      }
      setUploadingPhoto(true);
      await uploadProfilePicture(file, requestUploadUrl, confirmUpload);
      await refetch();
    } catch (err) {
      if (err instanceof ProfilePicturePickCanceled) return;
      setUploadError(
        err instanceof Error ? err.message : 'Failed to upload profile picture',
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onAvatarPress = () => {
    if (uploadingPhoto) return;
    void handlePickProfilePhoto();
  };

  const openBankDetailsModal = useCallback(() => {
    setBankDetailsSaveError(null);
    setBankModalVisible(true);
  }, []);

  const excludeOfferingIds = useMemo(
    () =>
      (tutor?.offerings ?? [])
        .map((o) => o.offeringId)
        .filter((id): id is number => id != null),
    [tutor?.offerings],
  );
  const primaryAddress = tutor?.addresses[0] ?? null;

  const handleSaveAddress = async (values: AddressFormValues) => {
    setAddressSaveError(null);
    const fullAddress = [
      values.street,
      values.subArea,
      values.city,
      values.state,
      values.postalCode,
      values.country,
    ]
      .filter(Boolean)
      .join(', ');

    try {
      await saveAddress({
        variables: {
          input: {
            type: 'HOME',
            street: values.street,
            subArea: values.subArea,
            city: values.city,
            state: values.state,
            country: values.country,
            postalCode: Number.parseInt(values.postalCode, 10),
            fullAddress,
            latitude: values.latitude,
            longitude: values.longitude,
          },
        },
      });
      await refetch();
      setAddressModalVisible(false);
    } catch (err) {
      setAddressSaveError(err instanceof Error ? err.message : 'Could not save address.');
    }
  };

  const handleAddOfferingComplete = useCallback(async () => {
    setShowAddOffering(false);
    await refetch();
  }, [refetch]);

  const timelineEntries = useMemo(
    () =>
      tutor
        ? buildOnboardingTimeline({
            certificationStage: tutor.certificationStage,
            regFeePaid: tutor.regFeePaid,
            regFeeDate: tutor.regFeeDate,
            addresses: tutor.addresses,
            qualifications: tutor.qualifications,
            experiences: tutor.experiences,
            offerings: tutor.offerings,
            documents: tutor.documents,
          })
        : [],
    [tutor],
  );

  const sortedQualifications = useMemo(
    () => sortQualificationsHighestFirst(tutor?.qualifications ?? []),
    [tutor?.qualifications],
  );

  const sortedOfferings = useMemo(
    () => sortTutorOfferingsForDisplay(tutor?.offerings ?? []),
    [tutor?.offerings],
  );

  const experiencesAsFormRows = useMemo(
    () => (tutor?.experiences ?? []).map((exp) => mapExperienceToFormRow(exp)),
    [tutor?.experiences],
  );

  const qualificationsAsFormRows = useMemo(
    () => (tutor?.qualifications ?? []).map((qual) => mapQualificationToFormRow(qual)),
    [tutor?.qualifications],
  );

  const availableQualificationTypes = useMemo(
    () =>
      getAvailableQualificationTypes(
        qualificationsAsFormRows.map((row) => row.qualificationType),
      ),
    [qualificationsAsFormRows],
  );

  const handleSaveExperiences = useCallback(
    async (rows: ExperienceFormRow[]) => {
      if (!tutor) return;
      setExperienceSaveError(null);
      try {
        await saveExperiences({
          variables: {
            input: {
              experiences: buildExperienceMutationInput(rows),
              yearsOfExperience: normalizeYearsOfExperience(tutor.yearsOfExperience),
              advanceToNextStep: false,
            },
          },
        });
        await refetch();
      } catch (err) {
        setExperienceSaveError(
          err instanceof Error ? err.message : 'Could not save experience.',
        );
        throw err;
      }
    },
    [tutor, saveExperiences, refetch],
  );

  const handleExperienceModalSubmit = useCallback(
    async (row: ExperienceFormRow) => {
      if (!experienceModal) return;
      const nextRows =
        experienceModal.mode === 'edit' && experienceModal.experienceId != null
          ? experiencesAsFormRows.map((existing) =>
              existing.id === experienceModal.experienceId
                ? { ...row, id: existing.id }
                : existing,
            )
          : [...experiencesAsFormRows, row];
      try {
        await handleSaveExperiences(nextRows);
        setExperienceModal(null);
      } catch {
        /* error surfaced via experienceSaveError */
      }
    },
    [experienceModal, experiencesAsFormRows, handleSaveExperiences],
  );

  const handleDeleteExperience = useCallback(
    (experienceId: number) => {
      Alert.alert(
        'Delete experience',
        'Delete this experience? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                setDeletingExperienceId(experienceId);
                try {
                  const nextRows = experiencesAsFormRows.filter(
                    (row) => row.id !== experienceId,
                  );
                  await handleSaveExperiences(nextRows);
                } finally {
                  setDeletingExperienceId(null);
                }
              })();
            },
          },
        ],
      );
    },
    [experiencesAsFormRows, handleSaveExperiences],
  );

  const experienceModalInitialRow = useMemo(() => {
    if (!experienceModal) return emptyExperienceRow();
    if (experienceModal.mode === 'edit' && experienceModal.experienceId != null) {
      return (
        experiencesAsFormRows.find((row) => row.id === experienceModal.experienceId) ??
        emptyExperienceRow()
      );
    }
    return emptyExperienceRow();
  }, [experienceModal, experiencesAsFormRows]);

  const handleSaveQualifications = useCallback(
    async (rows: QualificationFormRow[]) => {
      setQualificationSaveError(null);
      try {
        await saveQualifications({
          variables: {
            input: {
              qualifications: buildQualificationMutationInput(rows),
              advanceToNextStep: false,
            },
          },
        });
        await refetch();
      } catch (err) {
        setQualificationSaveError(
          err instanceof Error ? err.message : 'Could not save qualifications.',
        );
        throw err;
      }
    },
    [saveQualifications, refetch],
  );

  const handleQualificationModalSubmit = useCallback(
    async (row: QualificationFormRow) => {
      if (!qualificationModal) return;
      const nextRows =
        qualificationModal.mode === 'edit'
          ? qualificationsAsFormRows.map((existing) =>
              existing.qualificationType === row.qualificationType ? row : existing,
            )
          : [...qualificationsAsFormRows, row];
      try {
        await handleSaveQualifications(nextRows);
        setQualificationModal(null);
        setQualificationTypePickerOpen(false);
      } catch {
        /* error surfaced via qualificationSaveError */
      }
    },
    [qualificationModal, qualificationsAsFormRows, handleSaveQualifications],
  );

  const handleDeleteQualification = useCallback(
    (qualificationType: EducationalQualification) => {
      if (!canDeleteQualificationType(qualificationType)) return;
      Alert.alert(
        'Delete qualification',
        'Delete this qualification? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                setDeletingQualificationType(qualificationType);
                try {
                  const nextRows = qualificationsAsFormRows.filter(
                    (row) => row.qualificationType !== qualificationType,
                  );
                  await handleSaveQualifications(nextRows);
                } finally {
                  setDeletingQualificationType(null);
                }
              })();
            },
          },
        ],
      );
    },
    [qualificationsAsFormRows, handleSaveQualifications],
  );

  const handleAddQualification = useCallback(() => {
    if (availableQualificationTypes.length === 1) {
      setQualificationModal({
        mode: 'add',
        qualificationType: availableQualificationTypes[0],
      });
      return;
    }
    setQualificationTypePickerOpen(true);
  }, [availableQualificationTypes]);

  const handlePickQualificationType = useCallback((type: EducationalQualification) => {
    setQualificationTypePickerOpen(false);
    setQualificationModal({ mode: 'add', qualificationType: type });
  }, []);

  const qualificationModalInitialRow = useMemo(() => {
    if (!qualificationModal) {
      return emptyQualificationRow(EducationalQualification.HIGHER_SECONDARY);
    }
    if (qualificationModal.mode === 'edit') {
      return (
        qualificationsAsFormRows.find(
          (row) => row.qualificationType === qualificationModal.qualificationType,
        ) ?? emptyQualificationRow(qualificationModal.qualificationType)
      );
    }
    return emptyQualificationRow(qualificationModal.qualificationType);
  }, [qualificationModal, qualificationsAsFormRows]);

  const handleSaveRateCard = async (tutorOfferingId: number, values: RateCardFormValues) => {
    setRateCardSaveError(null);
    try {
      await saveRateCard({
        variables: {
          input: {
            tutorOfferingId,
            freeDemoOffered: values.freeDemoOffered,
            offlineEnabled: values.offlineEnabled,
            offlineBaseRate: values.offlineEnabled ? values.offlineBaseRate : null,
            offlineBaseDiscountPct: values.offlineEnabled
              ? values.offlineBaseDiscountPct
              : null,
            offlineSlab2DiscountPct: values.offlineEnabled
              ? values.offlineSlab2DiscountPct
              : null,
            offlineSlab3DiscountPct: values.offlineEnabled
              ? values.offlineSlab3DiscountPct
              : null,
            offlineBatchSize: values.offlineEnabled ? values.offlineBatchSize : null,
            onlineEnabled: values.onlineEnabled,
            onlineBaseRate: values.onlineEnabled ? values.onlineBaseRate : null,
            onlineBaseDiscountPct: values.onlineEnabled
              ? values.onlineBaseDiscountPct
              : null,
            onlineSlab2DiscountPct: values.onlineEnabled ? values.onlineSlab2DiscountPct : null,
            onlineSlab3DiscountPct: values.onlineEnabled ? values.onlineSlab3DiscountPct : null,
            onlineBatchSize: values.onlineEnabled ? values.onlineBatchSize : null,
          },
        },
      });
      await refetch();
      setRateCardOffering(null);
    } catch (err) {
      setRateCardSaveError(
        err instanceof Error ? err.message : 'Could not save rate card.',
      );
      throw err;
    }
  };

  const handleSaveBankDetails = async (values: BankDetailsFormValues) => {
    setBankDetailsSaveError(null);
    try {
      await saveBankDetails({
        variables: {
          input: {
            bankName: values.bankName,
            accountNumber: values.accountNumber,
            ifscCode: values.ifscCode,
            panNumber: values.panNumber,
            gstNumber: values.gstNumber.trim() || null,
          },
        },
      });
      await refetch();
      setBankModalVisible(false);
    } catch (err) {
      setBankDetailsSaveError(
        err instanceof Error ? err.message : 'Could not save bank details.',
      );
      throw err;
    }
  };

  if (loading && !tutor) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5fa8ff" />
        <Text style={styles.muted}>Loading your profile…</Text>
      </View>
    );
  }

  if (error || !tutor) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Could not load your tutor profile.</Text>
      </View>
    );
  }

  const feeAmount = tutor.regFeePaid ? tutor.regFeeAmount : tutor.regFeeAmountToBePaid;
  const totalExperience = sumExperienceDurations(tutor.experiences);
  const displayName = [tutor.user?.firstName, tutor.user?.lastName].filter(Boolean).join(' ').trim();

  if (showAddOffering) {
    return (
      <AddOfferingFlow
        excludeOfferingIds={excludeOfferingIds}
        testTutor={tutor.testTutor}
        onClose={() => setShowAddOffering(false)}
        onComplete={handleAddOfferingComplete}
      />
    );
  }

  if (ptOffering) {
    const offeringLabel =
      ptOffering.offeringFullLabel ??
      ptOffering.offeringDisplayName ??
      ptOffering.offeringName ??
      'this offering';
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Proficiency test</Text>
        <Text style={styles.subtitle}>{offeringLabel}</Text>
        <TutorPT
          context="profile"
          tutorOfferingId={ptOffering.id}
          offeringDisplayName={offeringLabel}
          attemptsUsed={ptOffering.attemptsUsed}
          testTutor={tutor.testTutor}
          onComplete={async () => {
            setPtOffering(null);
            await refetch();
          }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.profileHero}>
        <View style={styles.avatarColumn}>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={onAvatarPress}
            disabled={uploadingPhoto}
            activeOpacity={0.8}
            accessibilityLabel="Upload profile picture"
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>
                  {initialsFromProfileName(tutor.user?.firstName, tutor.user?.lastName)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {avatarUrl ? (
            <TouchableOpacity
              onPress={onAvatarPress}
              disabled={uploadingPhoto}
              activeOpacity={0.7}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color="#2563eb" size="small" />
              ) : (
                <Text style={styles.changePhotoLink}>Change</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.profileHeroText}>
          <Text style={styles.title}>{displayName || 'Your profile'}</Text>
          <Text style={styles.subtitle}>
            Tutor #{tutor.id}
            {tutor.certificationStage ? ` · ${tutor.certificationStage}` : ''}
          </Text>
          <Text style={styles.meta}>
            {formatMobile(tutor.user)}
            {tutor.user?.email ? ` · ${tutor.user.email}` : ''}
            {tutor.user?.createdDate ? ` · Registered ${formatDate(tutor.user.createdDate)}` : ''}
          </Text>
          {!avatarUrl ? (
            <TouchableOpacity
              onPress={onAvatarPress}
              disabled={uploadingPhoto}
              activeOpacity={0.7}
            >
              <Text style={styles.addPhotoLink}>
                {uploadingPhoto ? 'Uploading…' : 'Add profile photo'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {uploadError ? <Text style={styles.uploadErrorText}>{uploadError}</Text> : null}
        </View>
      </View>

      <TutorAvailabilitySection
        tutor={tutor}
        bankDetailsComplete={bankDetailsComplete}
        onOpenBankDetails={openBankDetailsModal}
        onOpenRateCard={(offering) => {
          if (offering.status !== 'pt_passed' || !bankDetailsComplete) return;
          setRateCardSaveError(null);
          setRateCardOffering(offering);
        }}
      />

      <View style={styles.offeringsSection}>
        <View style={styles.offeringsSectionHeaderRow}>
          <Text style={styles.offeringsSectionTitle}>Offerings</Text>
          <View style={styles.offeringsHeaderActions}>
            <Text style={styles.offeringsCount}>
              {formatEntryCount(tutor.offerings.length, 'offering', 'offerings')}
            </Text>
            <TouchableOpacity
              style={styles.addOfferingButton}
              onPress={() => setShowAddOffering(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.addOfferingButtonText}>Add offering</Text>
            </TouchableOpacity>
          </View>
        </View>
        {tutor.offerings.length === 0 ? (
          <Text style={styles.muted}>No offerings on file.</Text>
        ) : (
          <View style={styles.offeringsList}>
            {sortedOfferings.map((o) => {
              const hasRateCard = Boolean(o.rateCard?.isComplete);
              const ptPassed = o.status === 'pt_passed';
              const ptPending = o.status === 'pending_pt';
              const isExpanded = expandedOfferingId === o.id;
              const offeringLabel = formatOfferingLabelForDisplay(
                o.offeringFullLabel ??
                  o.offeringDisplayName ??
                  o.offeringName ??
                  'Offering',
              );

              return (
                <View key={o.id} style={styles.offeringGridCard}>
                  <View style={styles.offeringHeaderRow}>
                    <Text style={styles.offeringName} numberOfLines={1}>
                      {offeringLabel}
                    </Text>
                    <TouchableOpacity
                      style={styles.offeringChevronBtn}
                      onPress={() => toggleOfferingPtDetails(o.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isExpanded
                          ? 'Hide proficiency test details'
                          : 'Show proficiency test details'
                      }
                      accessibilityState={{ expanded: isExpanded }}
                    >
                      <Text style={styles.offeringChevron}>
                        {isExpanded ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isExpanded ? (
                    <View style={styles.ptDetailsPanel}>
                      <OfferingDetailField
                        label="PT status"
                        value={ptStatusLabel(o.status)}
                      />
                      <View
                        style={[
                          styles.offeringGridRow,
                          !offeringFieldsInRow && styles.offeringGridRowStacked,
                        ]}
                      >
                        <OfferingDetailField
                          label="Date"
                          value={formatDate(o.passedAt ?? o.lastAttemptAt)}
                        />
                        <OfferingDetailField
                          label="Score"
                          value={
                            o.lastScore != null && o.lastMaxScore != null
                              ? `${o.lastScore}/${o.lastMaxScore}`
                              : '—'
                          }
                        />
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.rateCardRow}>
                    {ptPending ? (
                      <TouchableOpacity
                        style={styles.rateCardButton}
                        onPress={() => setPtOffering(o)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.rateCardButtonText}>
                          Take proficiency test
                        </Text>
                      </TouchableOpacity>
                    ) : !ptPassed ? (
                      <Text style={styles.ptRequiredHint}>—</Text>
                    ) : hasRateCard ? (
                      <View style={styles.configuredBadge}>
                        <RateCardIcon />
                        <Text style={styles.configuredBadgeText}>Configured</Text>
                      </View>
                    ) : null}
                    {ptPassed && !bankDetailsComplete ? (
                      <View style={styles.bankDetailsGate}>
                        <Text style={styles.bankDetailsGateText}>
                          {BANK_DETAILS_REQUIRED_FOR_RATE_CARD_MESSAGE}
                        </Text>
                        <TouchableOpacity
                          style={styles.bankDetailsGateButton}
                          onPress={openBankDetailsModal}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.bankDetailsGateButtonText}>
                            Enter bank details
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : ptPassed && bankDetailsComplete ? (
                      !hasRateCard ? (
                        <TouchableOpacity
                          style={styles.rateCardButton}
                          onPress={() => {
                            setRateCardSaveError(null);
                            setRateCardOffering(o);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.rateCardButtonText}>Rate card</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.offeringEditBtn}
                          onPress={() => {
                            setRateCardSaveError(null);
                            setRateCardOffering(o);
                          }}
                          activeOpacity={0.7}
                          accessibilityLabel="Edit rate card"
                        >
                          <PenIcon />
                        </TouchableOpacity>
                      )
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View
        style={[
          styles.sideBySideRow,
          stackProfileSections ? styles.sideBySideRowStacked : null,
        ]}
      >
        <View
          style={[
            styles.section,
            styles.sideBySideCol,
            stackProfileSections ? styles.sideBySideColStacked : null,
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Experience</Text>
            <View style={styles.sectionHeaderActions}>
              <Text style={styles.experienceCount}>
                {formatEntryCount(tutor.experiences.length, 'experience', 'experiences')}
              </Text>
              <TouchableOpacity
                style={styles.addExperienceButton}
                onPress={() => setExperienceModal({ mode: 'add' })}
                disabled={savingExperiences}
              >
                <Text style={styles.addExperienceButtonText}>Add experience</Text>
              </TouchableOpacity>
            </View>
          </View>
          {tutor.experiences.length > 0 ? (
            <Text style={styles.badge}>
              {formatExperienceDuration(totalExperience)} total
            </Text>
          ) : null}
          {tutor.experiences.length === 0 ? (
            <Text style={styles.muted}>No experience on file.</Text>
          ) : (
            <>
              {tutor.experiences.map((exp) => {
                const months = experienceDurationMonths(exp);
                const durationLabel =
                  months != null
                    ? formatExperienceDuration(monthsToExperienceDuration(months))
                    : null;
                const isDeleting = deletingExperienceId === exp.id;

                return (
                  <View key={exp.id} style={styles.experienceItem}>
                    <View style={styles.experienceTitleRow}>
                      <Text style={[styles.rowBold, styles.experienceJobTitle]}>
                        {exp.jobTitle}
                      </Text>
                      <View style={styles.experienceActions}>
                        {durationLabel ? (
                          <Text style={styles.experienceDurationBadge}>{durationLabel}</Text>
                        ) : null}
                        <TouchableOpacity
                          style={styles.experienceIconButton}
                          onPress={() =>
                            setExperienceModal({ mode: 'edit', experienceId: exp.id })
                          }
                          disabled={savingExperiences}
                          accessibilityLabel="Edit experience"
                        >
                          <PenIcon />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.experienceIconButton}
                          onPress={() => handleDeleteExperience(exp.id)}
                          disabled={savingExperiences}
                          accessibilityLabel={
                            isDeleting ? 'Deleting experience' : 'Delete experience'
                          }
                        >
                          {isDeleting ? (
                            <ActivityIndicator size="small" color="#dc2626" />
                          ) : (
                            <TrashIcon />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.row}>
                      {exp.employerName ?? 'Self-employed'}
                      {exp.employerAddress ? ` · ${exp.employerAddress}` : ''}
                    </Text>
                    <Text style={styles.muted}>
                      {formatDate(exp.startDate)} –{' '}
                      {exp.isCurrent ? 'Present' : formatDate(exp.endDate)}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </View>

        <View
          style={[
            styles.section,
            styles.sideBySideCol,
            styles.educationCol,
            stackProfileSections ? styles.sideBySideColStacked : styles.educationColStretch,
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Education</Text>
            <View style={styles.sectionHeaderActions}>
              <Text style={styles.educationCount}>
                {formatEntryCount(sortedQualifications.length, 'qualification', 'qualifications')}
              </Text>
              {availableQualificationTypes.length > 0 ? (
                <TouchableOpacity
                  style={styles.addEducationButton}
                  onPress={handleAddQualification}
                  disabled={savingQualifications || qualificationTypePickerOpen}
                >
                  <Text style={styles.addEducationButtonText}>Add qualification</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          {sortedQualifications.length === 0 ? (
            <Text style={styles.muted}>No qualifications on file.</Text>
          ) : (
            <>
              {sortedQualifications.map((q) => {
                const qualType = q.qualificationType as EducationalQualification;
                const isDeleting = deletingQualificationType === qualType;
                const showDelete = canDeleteQualificationType(qualType);

                return (
                  <View key={q.id} style={styles.educationItem}>
                    <View style={styles.experienceTitleRow}>
                      <Text style={[styles.rowBold, styles.experienceJobTitle]}>
                        {formatQualificationTitle(q.qualificationType, q.degreeName)}
                      </Text>
                      <View style={styles.experienceActions}>
                        <TouchableOpacity
                          style={styles.experienceIconButton}
                          onPress={() =>
                            setQualificationModal({ mode: 'edit', qualificationType: qualType })
                          }
                          disabled={savingQualifications}
                          accessibilityLabel="Edit qualification"
                        >
                          <PenIcon />
                        </TouchableOpacity>
                        {showDelete ? (
                          <TouchableOpacity
                            style={styles.experienceIconButton}
                            onPress={() => handleDeleteQualification(qualType)}
                            disabled={savingQualifications}
                            accessibilityLabel={
                              isDeleting ? 'Deleting qualification' : 'Delete qualification'
                            }
                          >
                            {isDeleting ? (
                              <ActivityIndicator size="small" color="#dc2626" />
                            ) : (
                              <TrashIcon />
                            )}
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                    <Text style={styles.row}>
                      {q.boardOrUniversity} · {q.gradeType}: {q.gradeValue} · {q.yearObtained}
                    </Text>
                    {q.fieldOfStudy ? <Text style={styles.muted}>{q.fieldOfStudy}</Text> : null}
                  </View>
                );
              })}
            </>
          )}
          {qualificationTypePickerOpen ? (
            <View style={styles.typePickerPanel}>
              <Text style={styles.typePickerTitle}>Choose qualification type</Text>
              <View style={styles.typePickerChips}>
                {availableQualificationTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.typePickerChip}
                    onPress={() => handlePickQualificationType(type)}
                    disabled={savingQualifications}
                  >
                    <Text style={styles.typePickerChipText}>
                      {EDUCATIONAL_QUALIFICATION_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.typePickerCancel}
                  onPress={() => setQualificationTypePickerOpen(false)}
                  disabled={savingQualifications}
                >
                  <Text style={styles.typePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <BankDetailsSection
        bankDetails={tutor.user?.bankDetails}
        onEnterOrEdit={() => {
          setBankDetailsSaveError(null);
          setBankModalVisible(true);
        }}
      />

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.sectionHeaderActions}>
            <Text style={styles.addressCount}>
              {primaryAddress ? '1 address' : 'No address'}
            </Text>
            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={() => {
                setAddressSaveError(null);
                setAddressModalVisible(true);
              }}
              disabled={savingAddress}
            >
              <Text style={styles.addAddressButtonText}>
                {primaryAddress ? 'Edit address' : 'Enter address'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {!primaryAddress ? (
          <Text style={styles.muted}>No address on file.</Text>
        ) : (
          <View style={styles.addressItem}>
            <Text style={styles.row}>{formatAddress(primaryAddress)}</Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.sideBySideRow,
          stackProfileSections ? styles.sideBySideRowStacked : null,
        ]}
      >
        <View
          style={[
            styles.section,
            styles.sideBySideCol,
            stackProfileSections ? styles.sideBySideColStacked : null,
          ]}
        >
          <Text style={styles.sectionTitle}>Onboarding timeline</Text>
          {timelineEntries.map((entry) => (
            <View key={entry.id} style={styles.timelineRow}>
              <View
                style={[styles.timelineDot, { backgroundColor: timelineStatusColor(entry.status) }]}
              />
              <View style={styles.timelineBody}>
                <Text style={styles.row}>{entry.title}</Text>
                <Text style={styles.muted}>{formatTimelineDate(entry)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.section,
            styles.sideBySideCol,
            stackProfileSections ? styles.sideBySideColStacked : null,
          ]}
        >
          <Text style={styles.sectionTitle}>Registration fee</Text>
          <Text style={styles.row}>Status: {tutor.regFeePaid ? 'Paid' : 'Not received'}</Text>
          <Text style={styles.row}>Amount: {feeAmount != null ? `₹${feeAmount}` : '—'}</Text>
          <Text style={styles.row}>
            Date received: {tutor.regFeePaid ? formatDate(tutor.regFeeDate) : 'Not received'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Documents</Text>
        {tutor.documents.length === 0 ? (
          <Text style={styles.muted}>No documents uploaded.</Text>
        ) : (
          tutor.documents.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docCard}
              onPress={() => setSelectedDocument(doc)}
              activeOpacity={0.7}
            >
              <View style={styles.docCardHeader}>
                <Text style={styles.rowBold}>{doc.name ?? 'Document'}</Text>
                <Text style={styles.docStatusSmall}>
                  {documentStatusLabel(doc.screening?.status)}
                </Text>
              </View>
              {doc.previewUrl ? (
                <Image source={{ uri: doc.previewUrl }} style={styles.docThumb} resizeMode="contain" />
              ) : (
                <Text style={styles.muted}>Tap to view</Text>
              )}
              {doc.filename ? <Text style={styles.muted}>{doc.filename}</Text> : null}
            </TouchableOpacity>
          ))
        )}
      </View>

      {selectedDocument ? (
        <DocumentViewerModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      ) : null}

      <RateCardModal
        visible={rateCardOffering != null}
        offeringName={
          rateCardOffering
            ? formatOfferingLabelForDisplay(
                rateCardOffering.offeringFullLabel ??
                  rateCardOffering.offeringDisplayName ??
                  rateCardOffering.offeringName ??
                  'Offering',
              )
            : 'Offering'
        }
        initialValues={rateCardOffering?.rateCard}
        saving={savingRateCard}
        error={rateCardSaveError}
        onClose={() => {
          setRateCardOffering(null);
          setRateCardSaveError(null);
        }}
        onSubmit={async (values) => {
          if (!rateCardOffering) {
            return;
          }
          await handleSaveRateCard(rateCardOffering.id, values);
        }}
      />

      <BankDetailsModal
        visible={bankModalVisible}
        initialValues={tutor.user?.bankDetails}
        saving={savingBankDetails}
        error={bankDetailsSaveError}
        onClose={() => setBankModalVisible(false)}
        onSubmit={handleSaveBankDetails}
      />

      <AddressModal
        visible={addressModalVisible}
        initialValues={primaryAddress}
        saving={savingAddress}
        error={addressSaveError}
        onClose={() => {
          setAddressModalVisible(false);
          setAddressSaveError(null);
        }}
        onSubmit={(values) => void handleSaveAddress(values)}
      />

      <ExperienceModal
        visible={experienceModal != null}
        mode={experienceModal?.mode ?? 'add'}
        initialRow={experienceModalInitialRow}
        saving={savingExperiences}
        error={experienceSaveError}
        onClose={() => {
          setExperienceModal(null);
          setExperienceSaveError(null);
        }}
        onSubmit={(row) => void handleExperienceModalSubmit(row)}
      />

      <QualificationModal
        visible={qualificationModal != null}
        mode={qualificationModal?.mode ?? 'add'}
        initialRow={qualificationModalInitialRow}
        saving={savingQualifications}
        error={qualificationSaveError}
        onClose={() => {
          setQualificationModal(null);
          setQualificationTypePickerOpen(false);
          setQualificationSaveError(null);
        }}
        onSubmit={(row) => void handleQualificationModalSubmit(row)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  meta: { fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 18 },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    marginBottom: 16,
  },
  profileHeroText: {
    flex: 1,
    minWidth: 0,
  },
  avatarColumn: {
    alignItems: 'center',
    gap: 8,
  },
  avatarButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: '#475569',
  },
  changePhotoLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  addPhotoLink: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  uploadErrorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#dc2626',
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'stretch',
  },
  sideBySideRowStacked: {
    flexDirection: 'column',
  },
  sideBySideCol: {
    flex: 1,
    marginBottom: 0,
  },
  sideBySideColStacked: {
    flex: 0,
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  educationCol: {
    backgroundColor: '#fff',
  },
  educationColStretch: {
    flex: 1,
    alignSelf: 'stretch',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 0,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  experienceCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6d28d9',
  },
  educationCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4338ca',
  },
  offeringsHeaderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  offeringsCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f766e',
  },
  addOfferingButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addOfferingButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  offeringHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offeringChevronBtn: {
    padding: 4,
    borderRadius: 6,
  },
  offeringChevron: {
    fontSize: 12,
    color: '#0f766e',
    fontWeight: '600',
  },
  ptDetailsPanel: {
    borderTopWidth: 1,
    borderTopColor: '#ccfbf1',
    paddingTop: 8,
    gap: 8,
  },
  offeringEditBtn: {
    padding: 6,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  ptRequiredHint: {
    fontSize: 12,
    color: '#64748b',
  },
  bankDetailsGate: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  bankDetailsGateText: {
    fontSize: 11,
    color: '#92400e',
  },
  bankDetailsGateButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fbbf24',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bankDetailsGateButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },
  offeringsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99f6e4',
    padding: 16,
    marginBottom: 12,
  },
  offeringsSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  offeringsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f766e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  offeringsList: {
    gap: 12,
  },
  offeringGridCard: {
    backgroundColor: '#f0fdfa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    padding: 10,
    gap: 6,
  },
  offeringName: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600',
    color: '#134e4a',
  },
  offeringGridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  offeringGridRowStacked: {
    flexDirection: 'column',
    gap: 10,
  },
  offeringField: {
    flex: 1,
    minWidth: 0,
  },
  offeringFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f766e',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  offeringFieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#134e4a',
    marginTop: 2,
  },
  rateCardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  configuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  configuredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  rateCardButton: {
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  rateCardButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f766e',
  },
  addressCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0e7490',
  },
  addAddressButton: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addAddressButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  addressItem: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cffafe',
    backgroundColor: '#ecfeff',
  },
  experienceItem: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ede9fe',
    backgroundColor: '#f5f3ff',
  },
  experienceTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  experienceJobTitle: {
    flex: 1,
    marginBottom: 0,
  },
  experienceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  experienceDurationBadge: {
    backgroundColor: '#ddd6fe',
    color: '#5b21b6',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  experienceIconButton: {
    padding: 6,
    borderRadius: 8,
  },
  addExperienceButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addExperienceButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  educationItem: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    backgroundColor: '#eef2ff',
  },
  addEducationButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addEducationButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  typePickerPanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    backgroundColor: '#f5f7ff',
  },
  typePickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#312e81',
    marginBottom: 10,
  },
  typePickerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePickerChip: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  typePickerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338ca',
  },
  typePickerCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typePickerCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  row: { fontSize: 14, color: '#0f172a', lineHeight: 20, marginBottom: 6 },
  rowBold: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  muted: { fontSize: 14, color: '#64748b', marginBottom: 6 },
  error: { fontSize: 14, color: '#b91c1c' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7c3aed',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  blockItem: { marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  timelineRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  timelineBody: { flex: 1 },
  docCard: {
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f0fdf4',
  },
  docCardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  docStatusSmall: { fontSize: 11, fontWeight: '600', color: '#047857' },
  docThumb: { height: 120, width: '100%', marginBottom: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', flex: 1 },
  modalClose: { fontSize: 22, color: '#64748b', paddingLeft: 12 },
  docStatus: { fontSize: 12, fontWeight: '600', color: '#047857', marginVertical: 8 },
  modalImage: { height: 280, width: '100%', marginVertical: 8 },
  openPdfButton: {
    backgroundColor: '#0ea5e9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 12,
  },
  openPdfText: { color: '#fff', fontWeight: '600' },
  noteBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  noteLabel: { fontSize: 11, fontWeight: '600', color: '#92400e', textTransform: 'uppercase' },
  noteText: { fontSize: 14, color: '#78350f', marginTop: 4 },
});
