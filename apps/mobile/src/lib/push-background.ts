/** Must run before AppRegistry.registerComponent. Do not import Apollo here. */
export function registerBackgroundPushHandler(): void {
  try {
    const { NativeModules } = require('react-native') as {
      NativeModules?: Record<string, unknown>;
    };
    if (!NativeModules?.RNFBMessagingModule) {
      return;
    }
    const mod = require('@react-native-firebase/messaging') as {
      default?: () => { setBackgroundMessageHandler: (h: () => Promise<void>) => void };
    };
    const messaging = typeof mod === 'function' ? mod : mod?.default;
    if (typeof messaging !== 'function') {
      return;
    }
    messaging().setBackgroundMessageHandler(async () => {
      // Notification payload is displayed by the OS when the app is backgrounded.
    });
  } catch (error) {
    console.warn('[push] setBackgroundMessageHandler failed', error);
  }
}
