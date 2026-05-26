import { Platform, PermissionsAndroid } from 'react-native';
import {
  launchCamera,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import type { PickedFile } from './document-upload.types';
import { imageAssetToPickedFile } from './document-image.utils';

export class CameraCaptureCanceled extends Error {
  constructor() {
    super('Camera capture canceled');
    this.name = 'CameraCaptureCanceled';
  }
}

function mapCameraError(response: ImagePickerResponse): string {
  if (response.errorCode === 'camera_unavailable') {
    return 'Camera is not available on this device.';
  }
  if (response.errorCode === 'permission') {
    return 'Camera permission is required. Enable it in Settings and try again.';
  }
  return response.errorMessage ?? 'Could not open the camera. Please try again.';
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
      message:
        'Allow camera access to photograph your documents for verification.',
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

export async function captureDocumentImage(): Promise<PickedFile> {
  await ensureCameraPermission();

  const response = await launchCamera({
    mediaType: 'photo',
    quality: 0.8,
    maxWidth: 2048,
    maxHeight: 2048,
    includeBase64: false,
    saveToPhotos: false,
  });

  if (response.didCancel) {
    throw new CameraCaptureCanceled();
  }

  if (response.errorCode || response.errorMessage) {
    throw new Error(mapCameraError(response));
  }

  const asset = response.assets?.[0];
  if (!asset) {
    throw new Error('No photo was captured. Please try again.');
  }

  return imageAssetToPickedFile(asset);
}
