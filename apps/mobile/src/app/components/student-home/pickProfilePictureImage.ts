import { Alert, Platform, PermissionsAndroid } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import type { PickedProfileImage } from './uploadProfilePicture';

export class ProfilePicturePickCanceled extends Error {
  constructor() {
    super('Profile picture pick canceled');
    this.name = 'ProfilePicturePickCanceled';
  }
}

function mapPickerError(response: ImagePickerResponse): string {
  if (response.errorCode === 'camera_unavailable') {
    return 'Camera is not available on this device.';
  }
  if (response.errorCode === 'permission') {
    return 'Camera permission is required. Enable it in Settings and try again.';
  }
  return response.errorMessage ?? 'Could not open the camera. Please try again.';
}

function assetToProfileImage(asset: Asset): PickedProfileImage {
  if (!asset.uri) {
    throw new Error('No image was selected. Please try again.');
  }

  const ext =
    asset.type === 'image/png'
      ? 'png'
      : asset.fileName?.split('.').pop()?.toLowerCase() === 'png'
        ? 'png'
        : 'jpg';

  return {
    uri: asset.uri,
    name: asset.fileName ?? `profile.${ext}`,
    size: asset.fileSize ?? 0,
    type: asset.type ?? (ext === 'png' ? 'image/png' : 'image/jpeg'),
  };
}

async function ensureCameraPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const alreadyGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.CAMERA,
  );
  if (alreadyGranted) return;

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Camera permission',
      message: 'Allow camera access to take your profile photo.',
      buttonPositive: 'Allow',
      buttonNegative: 'Cancel',
    },
  );

  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error(
      'Camera permission is required. Enable it in Settings and try again.',
    );
  }
}

export async function pickProfilePictureFromLibrary(): Promise<PickedProfileImage> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    quality: 1,
  });

  if (result.didCancel) {
    throw new ProfilePicturePickCanceled();
  }

  if (result.errorCode || result.errorMessage) {
    throw new Error(result.errorMessage ?? 'Could not open photo library.');
  }

  const asset = result.assets?.[0];
  if (!asset) {
    throw new Error('No image was selected. Please try again.');
  }

  return assetToProfileImage(asset);
}

export async function captureProfilePictureFromCamera(): Promise<PickedProfileImage> {
  await ensureCameraPermission();

  const result = await launchCamera({
    mediaType: 'photo',
    quality: 0.8,
    maxWidth: 2048,
    maxHeight: 2048,
    includeBase64: false,
    saveToPhotos: false,
    cameraType: 'front',
  });

  if (result.didCancel) {
    throw new ProfilePicturePickCanceled();
  }

  if (result.errorCode || result.errorMessage) {
    throw new Error(mapPickerError(result));
  }

  const asset = result.assets?.[0];
  if (!asset) {
    throw new Error('No photo was captured. Please try again.');
  }

  return assetToProfileImage(asset);
}

export function promptProfilePictureSource(): Promise<PickedProfileImage> {
  return new Promise((resolve, reject) => {
    Alert.alert('Profile photo', 'How would you like to add your photo?', [
      {
        text: 'Take photo',
        onPress: () => {
          void captureProfilePictureFromCamera().then(resolve).catch(reject);
        },
      },
      {
        text: 'Choose from library',
        onPress: () => {
          void pickProfilePictureFromLibrary().then(resolve).catch(reject);
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => reject(new ProfilePicturePickCanceled()),
      },
    ]);
  });
}
