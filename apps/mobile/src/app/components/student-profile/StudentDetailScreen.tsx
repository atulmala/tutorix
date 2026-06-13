import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { GET_MY_STUDENT_DETAIL } from '@tutorix/shared-graphql/queries';
import {
  CONFIRM_PROFILE_PICTURE_UPLOAD,
  CREATE_STUDENT_ADDRESS,
  REQUEST_PROFILE_PICTURE_UPLOAD_URL,
  SAVE_STUDENT_EDUCATION,
  SAVE_STUDENT_PARENT_STEP,
} from '@tutorix/shared-graphql/mutations';
import {
  buildStudentOnboardingTimeline,
  formatDate,
  initialsFromProfileName,
  profilePictureAvatarUrl,
  SCHOOL_BOARD_OPTIONS,
  STUDENT_ONBOARDING_STEPS,
  STUDENT_TYPE_OPTIONS,
  type OnboardingTimelineEntry,
} from '@tutorix/shared-utils';
import type {
  EducationFormValues,
  ParentFormValues,
  StudentDetailRecord,
} from '@tutorix/student-detail-ui';
import { AddressModal, type AddressFormValues } from '../tutor-profile/AddressModal';
import { uploadProfilePicture } from '../student-home/uploadProfilePicture';
import {
  ProfilePicturePickCanceled,
  promptProfilePictureSource,
} from '../student-home/pickProfilePictureImage';
import { ParentModal } from './ParentModal';
import { EducationModal } from './EducationModal';

type MyStudentDetailData = {
  myStudentDetail: StudentDetailRecord;
};

function formatMobile(user?: StudentDetailRecord['user']): string {
  if (!user) return '—';
  if (user.mobile?.trim()) return user.mobile.trim();
  const combined = [user.mobileCountryCode, user.mobileNumber].filter(Boolean).join('');
  return combined || '—';
}

function formatAddress(address: StudentDetailRecord['addresses'][number]): string {
  if (address.fullAddress?.trim()) return address.fullAddress.trim();
  return [
    address.street,
    address.subArea,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

function formatParentRelation(value?: string | null): string {
  if (!value) return '—';
  if (value === 'FATHER') return 'Father';
  if (value === 'MOTHER') return 'Mother';
  return value;
}

function formatStudentType(value?: string | null): string {
  if (!value) return '—';
  return STUDENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function formatBoard(student: StudentDetailRecord): string {
  if (!student.board) return '—';
  if (student.board === 'OTHER' && student.boardOther?.trim()) {
    return student.boardOther;
  }
  return SCHOOL_BOARD_OPTIONS.find((o) => o.value === student.board)?.label ?? student.board;
}

function getStageTitle(student: StudentDetailRecord): string {
  if (student.onBoardingComplete) return 'Onboarding complete';
  const step = STUDENT_ONBOARDING_STEPS.find((s) => s.id === student.onboardingStage);
  return step?.title ?? student.onboardingStage ?? '—';
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

function formatTimelineDate(entry: OnboardingTimelineEntry): string {
  if (entry.completedAt) return formatDate(entry.completedAt);
  if (entry.status === 'current') return 'In progress';
  if (entry.status === 'skipped') return 'Skipped';
  return 'Pending';
}

export const StudentDetailScreen: React.FC = () => {
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [educationModalOpen, setEducationModalOpen] = useState(false);
  const [parentSaveError, setParentSaveError] = useState<string | null>(null);
  const [addressSaveError, setAddressSaveError] = useState<string | null>(null);
  const [educationSaveError, setEducationSaveError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, loading, error, refetch } = useQuery<MyStudentDetailData>(
    GET_MY_STUDENT_DETAIL,
    { fetchPolicy: 'cache-and-network' },
  );

  const [saveParent, { loading: savingParent }] = useMutation(SAVE_STUDENT_PARENT_STEP);
  const [saveAddress, { loading: savingAddress }] = useMutation(CREATE_STUDENT_ADDRESS);
  const [saveEducation, { loading: savingEducation }] = useMutation(SAVE_STUDENT_EDUCATION);
  const [requestUploadUrl] = useMutation(REQUEST_PROFILE_PICTURE_UPLOAD_URL);
  const [confirmUpload] = useMutation(CONFIRM_PROFILE_PICTURE_UPLOAD);

  const student = data?.myStudentDetail;
  const primaryAddress =
    student?.addresses.find((a) => a.primary) ?? student?.addresses[0] ?? null;
  const hasParent = Boolean(student?.parentRelation && student?.parentName?.trim());

  const timelineEntries = useMemo(
    () =>
      student
        ? buildStudentOnboardingTimeline({
            onboardingStage: student.onboardingStage,
            onBoardingComplete: student.onBoardingComplete,
            parentRelation: student.parentRelation,
            parentName: student.parentName,
            addresses: student.addresses,
          })
        : [],
    [student],
  );

  const avatarUrl = student ? profilePictureAvatarUrl(student.user) : null;
  const firstName = student?.user?.firstName;
  const lastName = student?.user?.lastName;

  const handlePickImage = async () => {
    setUploadError(null);
    try {
      const file = await promptProfilePictureSource();
      if (!file.size) {
        setUploadError('Could not read image size. Please try another photo.');
        return;
      }
      setUploading(true);
      await uploadProfilePicture(file, requestUploadUrl, confirmUpload);
      await refetch();
    } catch (err) {
      if (err instanceof ProfilePicturePickCanceled) return;
      setUploadError(
        err instanceof Error ? err.message : 'Failed to upload profile picture',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSaveParent = async (values: ParentFormValues) => {
    setParentSaveError(null);
    try {
      await saveParent({
        variables: {
          input: {
            parentRelation: values.parentRelation,
            parentName: values.parentName,
          },
        },
      });
      await refetch();
      setParentModalOpen(false);
    } catch (err) {
      setParentSaveError(
        err instanceof Error ? err.message : 'Could not save parent details.',
      );
    }
  };

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
      setAddressModalOpen(false);
    } catch (err) {
      setAddressSaveError(err instanceof Error ? err.message : 'Could not save address.');
    }
  };

  const handleSaveEducation = async (values: EducationFormValues) => {
    setEducationSaveError(null);
    try {
      await saveEducation({
        variables: {
          input: {
            studentType: values.studentType,
            schoolClass: values.schoolClass,
            board: values.board,
            boardOther: values.boardOther,
          },
        },
      });
      await refetch();
      setEducationModalOpen(false);
    } catch (err) {
      setEducationSaveError(
        err instanceof Error ? err.message : 'Could not save education details.',
      );
    }
  };

  const onAvatarPress = () => {
    if (uploading) return;
    void handlePickImage();
  };

  if (loading && !student) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </View>
    );
  }

  if (error || !student) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load your student profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.avatarColumn}>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={onAvatarPress}
              disabled={uploading}
              activeOpacity={0.8}
              accessibilityLabel="Upload profile picture"
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>
                    {initialsFromProfileName(firstName, lastName)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {uploading ? (
              <ActivityIndicator color="#2563eb" size="small" />
            ) : (
              <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.7}>
                <Text style={styles.changePhotoLink}>
                  {avatarUrl ? 'Change' : 'Add photo'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.heroText}>
            <Text style={styles.name}>
              {[firstName, lastName].filter(Boolean).join(' ') || 'Student'}
            </Text>
            <View style={styles.badgeRow}>
              <Text style={styles.idBadge}>#{student.id}</Text>
              <Text style={styles.stageBadge}>{getStageTitle(student)}</Text>
            </View>
            <Text style={styles.contact}>
              {formatMobile(student.user)}
              {student.user?.email ? ` · ${student.user.email}` : ''}
              {student.user?.createdDate
                ? ` · Registered ${formatDate(student.user.createdDate)}`
                : ''}
            </Text>
            {uploadError ? <Text style={styles.errorText}>{uploadError}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Parent / guardian</Text>
          <TouchableOpacity
            style={styles.editButtonParent}
            onPress={() => setParentModalOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.editButtonText}>
              {hasParent ? 'Edit parent' : 'Enter parent'}
            </Text>
          </TouchableOpacity>
        </View>
        {!hasParent ? (
          <Text style={styles.emptyText}>No parent or guardian details on file.</Text>
        ) : (
          <>
            <Text style={styles.row}>
              Relation: {formatParentRelation(student.parentRelation)}
            </Text>
            <Text style={styles.row}>Name: {student.parentName}</Text>
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Address</Text>
          <TouchableOpacity
            style={styles.editButtonCyan}
            onPress={() => setAddressModalOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.editButtonText}>
              {primaryAddress ? 'Edit address' : 'Enter address'}
            </Text>
          </TouchableOpacity>
        </View>
        {!primaryAddress ? (
          <Text style={styles.emptyText}>No address on file.</Text>
        ) : (
          <Text style={styles.addressText}>{formatAddress(primaryAddress)}</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Education</Text>
          <TouchableOpacity
            style={styles.editButtonAmber}
            onPress={() => setEducationModalOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.editButtonText}>Edit education</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.row}>Student type: {formatStudentType(student.studentType)}</Text>
        {student.studentType === 'SCHOOL' ? (
          <>
            <Text style={styles.row}>
              Class: {student.schoolClass != null ? String(student.schoolClass) : '—'}
            </Text>
            <Text style={styles.row}>Board: {formatBoard(student)}</Text>
          </>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Onboarding timeline</Text>
        {timelineEntries.map((entry) => (
          <View key={entry.id} style={styles.timelineRow}>
            <View
              style={[
                styles.timelineDot,
                { backgroundColor: timelineStatusColor(entry.status) },
              ]}
            />
            <View style={styles.timelineBody}>
              <Text style={styles.row}>{entry.title}</Text>
              <Text style={styles.muted}>{formatTimelineDate(entry)}</Text>
            </View>
          </View>
        ))}
      </View>

      <ParentModal
        visible={parentModalOpen}
        initialValues={student}
        saving={savingParent}
        error={parentSaveError}
        onClose={() => setParentModalOpen(false)}
        onSubmit={(values) => void handleSaveParent(values)}
      />

      <AddressModal
        visible={addressModalOpen}
        initialValues={primaryAddress}
        saving={savingAddress}
        error={addressSaveError}
        onClose={() => setAddressModalOpen(false)}
        onSubmit={(values) => void handleSaveAddress(values)}
      />

      <EducationModal
        visible={educationModalOpen}
        initialValues={student}
        saving={savingEducation}
        error={educationSaveError}
        onClose={() => setEducationModalOpen(false)}
        onSubmit={(values) => void handleSaveEducation(values)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 16,
  },
  avatarColumn: {
    alignItems: 'center',
    gap: 8,
  },
  avatarButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
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
    fontSize: 26,
    fontWeight: '600',
    color: 'rgba(20, 48, 85, 0.6)',
  },
  changePhotoLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#143055',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  idBadge: {
    backgroundColor: '#0ea5e9',
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageBadge: {
    backgroundColor: '#6366f1',
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  contact: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#143055',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editButtonParent: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonCyan: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonAmber: {
    backgroundColor: '#d97706',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    fontSize: 14,
    color: '#143055',
    marginBottom: 6,
  },
  muted: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  addressText: {
    fontSize: 14,
    color: '#143055',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 6,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  timelineBody: {
    flex: 1,
  },
});
