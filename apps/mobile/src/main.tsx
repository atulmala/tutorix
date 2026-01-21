import '@react-native-firebase/app';
import { AppRegistry } from 'react-native';
import App from './app/App';
import { initializeAnalytics, verifyAnalytics } from './lib/analytics';
import { initializeCrashlytics, verifyCrashlytics } from './lib/crashlytics';

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
  })
  .catch(() => {
    // Silently handle initialization errors
  });

AppRegistry.registerComponent('Mobile', () => App);
