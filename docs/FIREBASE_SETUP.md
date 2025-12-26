# Firebase Project Setup Guide

This guide will walk you through setting up Firebase Analytics for your Tutorix application.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `tutorix` (or your preferred name)
4. (Optional) Enable Google Analytics - Recommended
5. Select or create a Google Analytics account
6. Click **"Create project"**
7. Wait for project creation to complete
8. Click **"Continue"**

## Step 2: Register Your Apps

### 2.1 Register Web App (for apps/web and apps/web-admin)

1. In Firebase Console, click the **Web icon** (`</>`)
2. Register app:
   - App nickname: `Tutorix Web` (or separate apps: `Tutorix Web` and `Tutorix Admin`)
   - (Optional) Set up Firebase Hosting: No (we'll do this later if needed)
3. Copy the Firebase configuration object
4. Click **"Continue to console"**

**You'll get something like:**
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tutorix.firebaseapp.com",
  projectId: "tutorix",
  storageBucket: "tutorix.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAD-vvXCsYuLeCr-o37vaIUZ9pa-Rm-3TE",
  authDomain: "tutorix-b7882.firebaseapp.com",
  projectId: "tutorix-b7882",
  storageBucket: "tutorix-b7882.firebasestorage.app",
  messagingSenderId: "353992914030",
  appId: "1:353992914030:web:6b82bf074d3f3705a9a27f",
  measurementId: "G-KWT3GG7Z90"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
```

### 2.2 Register Mobile App (iOS)

1. Click the **iOS icon** (Apple logo)
2. Register app:
   - iOS bundle ID: Check your `apps/mobile/ios/Mobile.xcodeproj` - usually `com.mobile` or `com.tutorix.mobile`
   - App nickname: `Tutorix Mobile iOS`
   - App Store ID: (optional, can add later)
3. Download `GoogleService-Info.plist`
4. Click **"Continue to console"**

### 2.3 Register Mobile App (Android)

1. Click the **Android icon** (Android logo)
2. Register app:
   - Android package name: Check `apps/mobile/android/app/build.gradle` - look for `applicationId` (usually `com.mobile`)
   - App nickname: `Tutorix Mobile Android`
   - Debug signing certificate SHA-1: (optional for now)
3. Download `google-services.json`
4. Click **"Continue to console"**

## Step 3: Enable Analytics

1. In Firebase Console, go to **Analytics** → **Get started** (if not already enabled)
2. Select your Analytics account
3. Enable Analytics for your project

## Step 4: Get Configuration

### For Web Apps:
You'll need the Firebase config object (from Step 2.1). Save this for later.

### For Mobile Apps:
- **iOS**: You'll need `GoogleService-Info.plist`
- **Android**: You'll need `google-services.json`

## Step 5: Environment Configuration

After getting your Firebase configuration, you'll need to:

1. **Web Apps**: Add Firebase config to environment variables
2. **Mobile Apps**: Add the downloaded files to your project
3. **Backend API**: (Optional) Add Firebase Admin SDK service account key

## Next Steps

After completing Firebase setup, proceed with:
1. Installing Firebase packages
2. Adding configuration files
3. Initializing Firebase in each app
4. Testing analytics tracking

## Important Notes

- **Development vs Production**: Consider creating separate Firebase projects for dev/staging/prod
- **Privacy**: Make sure to comply with GDPR/CCPA if applicable
- **Analytics Collection**: Analytics is automatically disabled in debug mode for React Native

