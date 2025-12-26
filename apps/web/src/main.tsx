import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import { initializeAnalytics } from './lib/analytics';
import { getFirebaseConfig } from './lib/firebase-config';

// Initialize Firebase Analytics
try {
  const firebaseConfig = getFirebaseConfig();
  initializeAnalytics(firebaseConfig)
    .then(() => {
      console.log('✅ Firebase Analytics initialized');
    })
    .catch((error) => {
      console.error('❌ Failed to initialize Firebase Analytics:', error);
    });
} catch (error) {
  console.warn('⚠️ Firebase Analytics configuration missing:', error);
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
