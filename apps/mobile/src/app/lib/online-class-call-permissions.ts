import { PermissionsAndroid, Platform } from 'react-native';

export async function ensureOnlineClassCallPermissions(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const needed = [
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ];

  const missing: string[] = [];
  for (const permission of needed) {
    const granted = await PermissionsAndroid.check(permission);
    if (!granted) {
      missing.push(permission);
    }
  }

  if (missing.length === 0) {
    return;
  }

  const result = await PermissionsAndroid.requestMultiple(missing);
  const denied = needed.filter(
    (permission) => result[permission] !== PermissionsAndroid.RESULTS.GRANTED,
  );
  if (denied.length > 0) {
    throw new Error(
      'Camera and microphone access are required for class video. Enable them in Settings and rejoin.',
    );
  }
}
