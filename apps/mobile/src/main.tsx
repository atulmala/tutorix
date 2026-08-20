import { AppRegistry, View, Text } from 'react-native';
import React from 'react';

function FallbackApp({ error }: { error?: unknown }) {
  const text = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#f00' }}>
        App failed to load
      </Text>
      <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

// Patch rehackt before any Apollo import (App.tsx).
if (typeof global !== 'undefined') {
  try {
    (global as { React?: typeof React }).React = React;
  } catch {
    // React 19 may freeze this property; the per-key rehackt patch below still applies.
  }
}
try {
  const rehackt = require('rehackt');
  if (rehackt && (!rehackt.useContext || rehackt.useContext !== React.useContext)) {
    (Object.keys(React) as Array<keyof typeof React>).forEach((key) => {
      try {
        rehackt[key] = React[key];
      } catch {
        // Some React 19 properties are not writable.
      }
    });
    console.log('[main.tsx] Patched rehackt to use React Native React instance');
  }
} catch (error) {
  console.warn('[main.tsx] Could not patch rehackt:', error);
}

try {
  require('@react-native-firebase/app');
  require('@react-native-firebase/crashlytics');
  require('@react-native-firebase/remote-config');
  require('@react-native-firebase/messaging');
  require('./lib/push-background').registerBackgroundPushHandler();
} catch (error) {
  console.warn('[main.tsx] Firebase/push require failed:', error);
}

AppRegistry.registerComponent('Mobile', () => {
  try {
    const App = require('./app/App').default;
    if (!App) {
      throw new Error("Cannot read property 'default' of undefined");
    }
    return App;
  } catch (error) {
    return function FailedApp() {
      return <FallbackApp error={error} />;
    };
  }
});

try {
  require('./lib/remote-config')
    .initializeRemoteConfig()
    .catch((error: unknown) => {
      console.warn('[main.tsx] Remote Config initialization failed:', error);
    });
  require('./lib/analytics')
    .initializeAnalytics()
    .then(async () => {
      await require('./lib/analytics').verifyAnalytics();
    })
    .catch((error: unknown) => {
      console.warn('[main.tsx] Analytics initialization failed:', error);
    });
  require('./lib/crashlytics')
    .initializeCrashlytics()
    .then(async () => {
      const verified = await require('./lib/crashlytics').verifyCrashlytics();
      if (!verified) {
        console.warn(
          '[main.tsx] Crashlytics collection is disabled — rebuild native app after adding firebase.json',
        );
      }
    })
    .catch((error: unknown) => {
      console.warn('[main.tsx] Crashlytics initialization failed:', error);
    });
} catch (error) {
  console.warn('[main.tsx] Post-register init failed:', error);
}
