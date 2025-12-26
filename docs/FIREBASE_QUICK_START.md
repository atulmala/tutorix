# Firebase Analytics Quick Start Guide

This is a condensed guide to get Firebase Analytics up and running quickly.

## ⚡ Quick Setup (5 Steps)

### 1. Create Firebase Project
- Go to [Firebase Console](https://console.firebase.google.com/)
- Create a new project named "tutorix"
- Enable Google Analytics

### 2. Register Apps in Firebase Console

**Web App:**
- Click Web icon (`</>`)
- Register as "Tutorix Web"
- Copy the config object

**Mobile iOS:**
- Click iOS icon
- Use bundle ID: `com.mobile` (check your Xcode project)
- Download `GoogleService-Info.plist`

**Mobile Android:**
- Click Android icon
- Use package name: `com.mobile` (check build.gradle)
- Download `google-services.json`

### 3. Install Packages

```bash
# Install Firebase packages
npm install firebase @react-native-firebase/app @react-native-firebase/analytics

# For iOS
cd apps/mobile/ios && pod install && cd ../../..
```

### 4. Add Configuration Files

**Web:** Add Firebase config to `.env`:
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Mobile iOS:** 
- Place `GoogleService-Info.plist` in `apps/mobile/ios/Mobile/`
- Add to Xcode project

**Mobile Android:**
- Place `google-services.json` in `apps/mobile/android/app/`

### 5. Test It

```tsx
// In any React component (Web)
import { useAnalytics } from './hooks/useAnalytics';

function MyComponent() {
  const { analytics } = useAnalytics();
  
  const handleClick = () => {
    analytics.trackButtonClick('test_button');
  };
  
  return <button onClick={handleClick}>Test</button>;
}
```

Start your apps and check Firebase Console → Analytics → Events to see tracked events!

## 📚 Full Documentation

- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Detailed Firebase project setup
- [FIREBASE_ANALYTICS_IMPLEMENTATION.md](./FIREBASE_ANALYTICS_IMPLEMENTATION.md) - Complete implementation guide
- [FIREBASE_PACKAGE_INSTALLATION.md](./FIREBASE_PACKAGE_INSTALLATION.md) - Package installation details


