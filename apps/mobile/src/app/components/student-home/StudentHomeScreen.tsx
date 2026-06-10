import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { launchImageLibrary } from 'react-native-image-picker';
import { GET_MY_STUDENT_PROFILE } from '@tutorix/shared-graphql/queries';
import {
  CONFIRM_PROFILE_PICTURE_UPLOAD,
  REQUEST_PROFILE_PICTURE_UPLOAD_URL,
} from '@tutorix/shared-graphql/mutations';
import {
  uploadProfilePicture,
  type PickedProfileImage,
} from './uploadProfilePicture';

type StudentHomeScreenProps = {
  currentUser?: {
    firstName?: string;
    lastName?: string;
  } | null;
};

function initialsFromName(first?: string, last?: string): string {
  const f = first?.trim()?.[0] ?? '';
  const l = last?.trim()?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

export const StudentHomeScreen: React.FC<StudentHomeScreenProps> = ({
  currentUser,
}) => {
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
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') || 'Student';
  const avatarUrl =
    user?.profilePicture ?? user?.profilePictureThumbnailMedium;

  const handlePickImage = async () => {
    setUploadError(null);

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 1,
    });

    if (result.didCancel) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      setUploadError('No image was selected. Please try again.');
      return;
    }

    const file: PickedProfileImage = {
      uri: asset.uri,
      name: asset.fileName ?? 'profile.jpg',
      size: asset.fileSize ?? 0,
      type: asset.type ?? 'image/jpeg',
    };

    if (!file.size) {
      setUploadError('Could not read image size. Please try another photo.');
      return;
    }

    setUploading(true);
    try {
      await uploadProfilePicture(file, requestUploadUrl, confirmUpload);
      await refetch();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to upload profile picture',
      );
    } finally {
      setUploading(false);
    }
  };

  const onAvatarPress = () => {
    if (uploading) return;
    void handlePickImage();
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.hero}>
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
                  {initialsFromName(firstName, lastName)}
                </Text>
              </View>
            )}
            <View style={styles.avatarOverlay}>
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.avatarOverlayText}>Change</Text>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.heroText}>
            <Text style={styles.welcomeTitle}>Welcome, {displayName}</Text>
            <Text style={styles.welcomeSubtitle}>
              Your student profile is ready. Add a profile photo so tutors can
              recognize you.
            </Text>
            {!avatarUrl && (
              <TouchableOpacity
                onPress={onAvatarPress}
                disabled={uploading}
                activeOpacity={0.7}
              >
                <Text style={styles.addPhotoLink}>
                  {uploading ? 'Uploading…' : 'Add profile photo'}
                </Text>
              </TouchableOpacity>
            )}
            {uploadError && (
              <Text style={styles.errorText}>{uploadError}</Text>
            )}
          </View>
        </View>

        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>
            Find tutors, book sessions, and track your learning — coming soon.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
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
    fontWeight: '600',
    color: 'rgba(20, 48, 85, 0.6)',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  avatarOverlayText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#143055',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 20,
  },
  addPhotoLink: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5fa8ff',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 8,
  },
  comingSoon: {
    marginTop: 40,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: 'rgba(249, 250, 251, 0.5)',
    padding: 24,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
