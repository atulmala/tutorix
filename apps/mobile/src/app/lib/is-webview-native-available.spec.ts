import { TurboModuleRegistry } from 'react-native';
import { isWebViewNativeAvailable } from './is-webview-native-available';

describe('isWebViewNativeAvailable', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns true when RNCWebViewModule is registered', () => {
    jest.spyOn(TurboModuleRegistry, 'get').mockReturnValue({} as never);
    expect(isWebViewNativeAvailable()).toBe(true);
  });

  it('returns false when the module is missing', () => {
    jest.spyOn(TurboModuleRegistry, 'get').mockReturnValue(null);
    expect(isWebViewNativeAvailable()).toBe(false);
  });
});
