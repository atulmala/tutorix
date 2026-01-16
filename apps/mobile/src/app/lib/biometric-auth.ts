import * as Keychain from 'react-native-keychain';

const BIOMETRIC_SERVICE = 'tutorix_biometric_refresh_token';

export async function getSupportedBiometryType(): Promise<
  'FaceID' | 'TouchID' | 'Biometrics' | null
> {
  try {
    const type = await Keychain.getSupportedBiometryType();
    if (!type) {
      return null;
    }
    switch (type) {
      case Keychain.BIOMETRY_TYPE.FACE_ID:
        return 'FaceID';
      case Keychain.BIOMETRY_TYPE.TOUCH_ID:
        return 'TouchID';
      case Keychain.BIOMETRY_TYPE.FINGERPRINT:
      case Keychain.BIOMETRY_TYPE.FACE:
      case Keychain.BIOMETRY_TYPE.IRIS:
      default:
        return 'Biometrics';
    }
  } catch {
    return null;
  }
}

export async function hasBiometricToken(): Promise<boolean> {
  try {
    return await Keychain.hasGenericPassword({ service: BIOMETRIC_SERVICE });
  } catch {
    return false;
  }
}

export async function saveBiometricToken(refreshToken: string): Promise<void> {
  await Keychain.setGenericPassword('refresh_token', refreshToken, {
    service: BIOMETRIC_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getBiometricToken(promptTitle?: string): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({
      service: BIOMETRIC_SERVICE,
      authenticationPrompt: {
        title: promptTitle ?? 'Login to Tutorix',
        subtitle: 'Authenticate to continue',
      },
    });
    if (creds && typeof creds.password === 'string') {
      return creds.password;
    }
  } catch {
    return null;
  }
  return null;
}

export async function clearBiometricToken(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE });
  } catch {
    // no-op
  }
}
