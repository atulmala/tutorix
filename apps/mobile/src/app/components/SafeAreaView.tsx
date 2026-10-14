import React from 'react';
import {
  Dimensions,
  Platform,
  StatusBar,
  TurboModuleRegistry,
  View,
  SafeAreaView as RNSafeAreaView,
  type StyleProp,
  type TurboModule,
  type ViewStyle,
} from 'react-native';

type StatusBarManagerModule = {
  getConstants: () => { HEIGHT?: number };
};

/** Typical gesture nav bar height when edge-to-edge hides it from Dimensions. */
const ANDROID_FALLBACK_BOTTOM_INSET_DP = 48;

export function androidEdgeToEdgeEnabled(): boolean {
  return Platform.OS === 'android' && Number(Platform.Version) >= 35;
}

let statusBarHeight = 0;

/**
 * `StatusBar.currentHeight` is read once at startup from the window insets and
 * is 0 when the window was not attached yet (cold start, Metro reload). Ask
 * the native module again until it reports a real height.
 */
function androidStatusBarHeight(): number {
  if (statusBarHeight > 0) {
    return statusBarHeight;
  }
  let height = StatusBar.currentHeight ?? 0;
  if (height <= 0) {
    try {
      const manager = TurboModuleRegistry.get<TurboModule>(
        'StatusBarManager',
      ) as StatusBarManagerModule | null;
      height = manager?.getConstants().HEIGHT ?? 0;
    } catch {
      height = 0;
    }
  }
  if (height > 0) {
    statusBarHeight = height;
  }
  return height;
}

/**
 * Android 15+ draws edge-to-edge when targetSdk is 35. React Native's
 * SafeAreaView only pads iOS, so headers sit under the status bar.
 */
export function androidTopInset(): number {
  if (!androidEdgeToEdgeEnabled()) {
    return 0;
  }
  return androidStatusBarHeight();
}

/** System navigation bar (gesture bar / 3-button bar) inset in layout dp. */
export function androidBottomInset(): number {
  if (Platform.OS !== 'android') {
    return 0;
  }
  const screen = Dimensions.get('screen');
  const window = Dimensions.get('window');
  const fromDimensions = Math.max(0, screen.height - window.height);
  if (fromDimensions > 0) {
    return fromDimensions;
  }
  if (androidEdgeToEdgeEnabled()) {
    return ANDROID_FALLBACK_BOTTOM_INSET_DP;
  }
  return 0;
}

type SafeAreaViewProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Which insets to apply. iOS still uses the system safe area. */
  edges?: Array<'top' | 'bottom'>;
};

export const SafeAreaView: React.FC<SafeAreaViewProps> = ({
  children,
  style,
  edges = ['top'],
}) => {
  if (Platform.OS !== 'android') {
    return <RNSafeAreaView style={style}>{children}</RNSafeAreaView>;
  }

  const paddingTop = edges.includes('top') ? androidTopInset() : 0;
  const paddingBottom = edges.includes('bottom') ? androidBottomInset() : 0;
  return (
    <View
      style={[
        style,
        paddingTop > 0 ? { paddingTop } : null,
        paddingBottom > 0 ? { paddingBottom } : null,
      ]}
    >
      {children}
    </View>
  );
};
