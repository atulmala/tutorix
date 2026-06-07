import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/app';
import { GraphQLProvider } from '@tutorix/shared-graphql';
import { initializeAnalytics } from './lib/analytics';
import { getFirebaseConfig } from './lib/firebase-config';
import './styles.css';

try {
  const firebaseConfig = getFirebaseConfig();
  initializeAnalytics(firebaseConfig)
    .then(() => {
      console.log('✅ Firebase Analytics initialized (admin)');
    })
    .catch((error) => {
      console.error('❌ Failed to initialize Firebase Analytics (admin):', error);
    });
} catch (error) {
  console.warn('⚠️ Firebase Analytics configuration missing (admin):', error);
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <GraphQLProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GraphQLProvider>
  </StrictMode>,
);
