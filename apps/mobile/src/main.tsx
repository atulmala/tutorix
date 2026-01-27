import '@react-native-firebase/app';
import { AppRegistry, View, Text, ErrorUtils } from 'react-native';
import React from 'react';
import { initializeAnalytics, verifyAnalytics } from './lib/analytics';
import { initializeCrashlytics, verifyCrashlytics, recordError } from './lib/crashlytics';

// CRITICAL: Patch rehackt to use the same React instance as React Native
// Apollo Client uses rehackt which does require('react') at runtime
// We need to ensure it gets the SAME React instance that React Native is using
if (typeof global !== 'undefined') {
  global.React = React;
  
  // Patch rehackt's React instance before Apollo Client loads
  try {
    const rehackt = require('rehackt');
    // Force rehackt to use our React instance by replacing all its React methods
    if (rehackt && (!rehackt.useContext || rehackt.useContext !== React.useContext)) {
      // Copy all React properties to rehackt
      Object.keys(React).forEach(key => {
        rehackt[key] = React[key];
      });
      console.log('[main.tsx] ✅ Patched rehackt to use React Native React instance');
    }
  } catch (error) {
    console.warn('[main.tsx] ⚠️ Could not patch rehackt:', error);
  }
}

console.log('[main.tsx] Starting app registration...');

// Import App with error handling
let App;
try {
  console.log('[main.tsx] Attempting to import App...');
  App = require('./app/App').default;
  console.log('[main.tsx] ✅ App imported successfully, type:', typeof App);
} catch (error) {
  console.error('[main.tsx] ❌ Failed to import App:', error);
  // Fallback component to show error
  App = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#f00' }}>
        App Import Error
      </Text>
      <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 10 }}>
        Failed to load App component
      </Text>
      <Text style={{ fontSize: 12, color: '#999' }}>
        {error instanceof Error ? error.message : String(error)}
      </Text>
      {error instanceof Error && error.stack && (
        <Text style={{ fontSize: 10, color: '#ccc', marginTop: 10 }}>
          {error.stack}
        </Text>
      )}
    </View>
  );
}

// Initialize Firebase Analytics
// Note: React Native Firebase Analytics initializes automatically when the app starts
// This just ensures our wrapper is ready
initializeAnalytics()
  .then(async () => {
    // Verify analytics is working
    await verifyAnalytics();
  })
  .catch(() => {
    // Silently handle initialization errors
  });

// Initialize Firebase Crashlytics
// Note: React Native Firebase Crashlytics initializes automatically when the app starts
// This just ensures our wrapper is ready
// Completely separate from Analytics initialization
initializeCrashlytics()
  .then(async () => {
    // Verify crashlytics is working
    await verifyCrashlytics();
    
    // Set up global error handler to catch unhandled errors
    // This will catch errors that aren't caught by ErrorBoundary
    const originalHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      // Record to Crashlytics
      try {
        recordError(error, isFatal ? 'FatalError' : 'UnhandledError');
        console.log(`[Global Error Handler] Recorded ${isFatal ? 'fatal' : 'non-fatal'} error to Crashlytics`);
      } catch (crashlyticsError) {
        console.warn('[Global Error Handler] Failed to record error to Crashlytics:', crashlyticsError);
      }
      
      // Call original handler to maintain default behavior
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
    
    console.log('[main.tsx] ✅ Global error handler configured for Crashlytics');
  })
  .catch(() => {
    // Silently handle initialization errors
  });

// Register the component with a wrapper to catch errors
AppRegistry.registerComponent('Mobile', () => {
  console.log('[main.tsx] 🚀 Registering Mobile component, App type:', typeof App);
  if (!App) {
    console.error('[main.tsx] ❌ App is null or undefined!');
    return () => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f00' }}>
        <Text style={{ color: '#fff', fontSize: 20 }}>App is null!</Text>
      </View>
    );
  }
  return App;
});
