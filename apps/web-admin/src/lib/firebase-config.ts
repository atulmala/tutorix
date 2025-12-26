/**
 * Firebase Configuration for Web Admin App
 * 
 * Load Firebase config from environment variables
 * Can use same Firebase project or separate one for admin
 */

import { FirebaseConfig } from './analytics';

/**
 * Default Firebase configuration for Admin App
 * Uses same Firebase project as main web app
 * Can be overridden via environment variables
 */
const defaultFirebaseConfig: FirebaseConfig = {
  apiKey: 'AIzaSyAD-vvXCsYuLeCr-o37vaIUZ9pa-Rm-3TE',
  authDomain: 'tutorix-b7882.firebaseapp.com',
  projectId: 'tutorix-b7882',
  storageBucket: 'tutorix-b7882.firebasestorage.app',
  messagingSenderId: '353992914030',
  appId: '1:353992914030:web:6b82bf074d3f3705a9a27f',
  measurementId: 'G-KWT3GG7Z90',
};

export function getFirebaseConfig(): FirebaseConfig {
  // Check if running in browser
  if (typeof window === 'undefined') {
    throw new Error('Firebase config can only be accessed in browser environment');
  }

  // Use environment variables if available, otherwise use defaults
  // Admin app can use separate appId if registered separately in Firebase Console
  const config: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_ADMIN_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId,
  };

  // Validate required fields
  const requiredFields: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required Firebase configuration: ${missingFields.join(', ')}. ` +
      'Please check your environment variables or default configuration.'
    );
  }

  return config;
}


