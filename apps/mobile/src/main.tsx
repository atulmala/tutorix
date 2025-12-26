import { AppRegistry } from 'react-native';
import App from './app/App';
import { initializeAnalytics } from './lib/analytics';

// Initialize Firebase Analytics
// Note: React Native Firebase Analytics initializes automatically when the app starts
// This just ensures our wrapper is ready
initializeAnalytics()
  .then(() => {
    console.log('✅ Firebase Analytics initialized (Mobile)');
  })
  .catch((error) => {
    console.error('❌ Failed to initialize Firebase Analytics:', error);
  });

AppRegistry.registerComponent('Mobile', () => App);
