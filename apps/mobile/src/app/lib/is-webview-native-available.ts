import { TurboModuleRegistry } from 'react-native';

/** True when the RNCWebView native module is registered (required for online class whiteboard). */
export function isWebViewNativeAvailable(): boolean {
  try {
    return TurboModuleRegistry.get('RNCWebViewModule') != null;
  } catch {
    return false;
  }
}
