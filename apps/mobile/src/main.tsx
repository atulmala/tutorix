import '@react-native-firebase/app';
import { AppRegistry } from 'react-native';
import App from './app/App';
import { initializeAnalytics, verifyAnalytics } from './lib/analytics';
import { initializeCrashlytics, verifyCrashlytics } from './lib/crashlytics';

// Initialize Firebase Analytics
// Note: React Native Firebase Analytics initializes automatically when the app starts
// This just ensures our wrapper is ready
console.log('🚀 Starting app initialization...');
initializeAnalytics()
  .then(async () => {
    console.log('✅ Firebase Analytics initialized (Mobile)');
    // Verify analytics is working
    await verifyAnalytics();
  })
  .catch((error) => {
    console.error('❌ Failed to initialize Firebase Analytics:', error);
    console.error('Error details:', error.message);
  });

// Initialize Firebase Crashlytics
// Note: React Native Firebase Crashlytics initializes automatically when the app starts
// This just ensures our wrapper is ready
// Completely separate from Analytics initialization
initializeCrashlytics()
  .then(async () => {
    console.log('✅ Firebase Crashlytics initialized (Mobile)');
    // Verify crashlytics is working
    await verifyCrashlytics();
  })
  .catch((error) => {
    console.error('❌ Failed to initialize Firebase Crashlytics:', error);
    console.error('Error details:', error.message);
  });

AppRegistry.registerComponent('Mobile', () => App);
