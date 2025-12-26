# Firebase Analytics Setup Checklist

Follow these steps to complete your Firebase Analytics setup.

## ✅ Step 1: Create Firebase Project

- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Click "Create a project"
- [ ] Enter project name: `tutorix` (or your preferred name)
- [ ] Enable Google Analytics (recommended)
- [ ] Wait for project creation
- [ ] Click "Continue"

## ✅ Step 2: Register Web App

- [ ] In Firebase Console, click Web icon (`</>`)
- [ ] Register app nickname: `Tutorix Web`
- [ ] Copy Firebase configuration object
- [ ] Save config values for `.env` file

## ✅ Step 3: Register Mobile iOS App

- [ ] In Firebase Console, click iOS icon
- [ ] Enter bundle ID: `com.mobile` (verify in Xcode project)
- [ ] App nickname: `Tutorix Mobile iOS`
- [ ] Download `GoogleService-Info.plist`
- [ ] Save file location: `apps/mobile/ios/Mobile/`

## ✅ Step 4: Register Mobile Android App

- [ ] In Firebase Console, click Android icon
- [ ] Enter package name: `com.mobile` (verify in build.gradle)
- [ ] App nickname: `Tutorix Mobile Android`
- [ ] Download `google-services.json`
- [ ] Save file location: `apps/mobile/android/app/`

## ✅ Step 5: Install Packages

```bash
# Install Firebase packages
npm install firebase @react-native-firebase/app @react-native-firebase/analytics

# Install iOS dependencies
cd apps/mobile/ios && pod install && cd ../../..
```

## ✅ Step 6: Add Configuration Files

### Web Apps
- [ ] Create/update `.env` file in project root
- [ ] Add Firebase config variables (see example below)

### Mobile iOS
- [ ] Place `GoogleService-Info.plist` in `apps/mobile/ios/Mobile/`
- [ ] Open `apps/mobile/ios/Mobile.xcworkspace` in Xcode
- [ ] Drag `GoogleService-Info.plist` into Xcode project
- [ ] Ensure it's added to "Mobile" target

### Mobile Android
- [ ] Place `google-services.json` in `apps/mobile/android/app/`
- [ ] Verify file is named exactly `google-services.json`

## ✅ Step 7: Update Environment Variables

Add to `.env` file:

```env
# Firebase Web App Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## ✅ Step 8: Verify Android Build Configuration

Android build.gradle files have been updated automatically. Verify:
- [ ] `apps/mobile/android/build.gradle` has Google Services classpath
- [ ] `apps/mobile/android/app/build.gradle` applies Google Services plugin

## ✅ Step 9: Test Integration

### Web Apps
- [ ] Start web app: `npm run serve:web`
- [ ] Check browser console for: `✅ Firebase Analytics initialized`
- [ ] Check Network tab for Firebase Analytics requests

### Mobile App
- [ ] Build and run mobile app
- [ ] Check console for: `✅ Firebase Analytics initialized (Mobile)`
- [ ] Verify in Firebase Console → Analytics → Events

## ✅ Step 10: Integrate with Authentication

- [ ] Track registration events after user registers
- [ ] Track login events after user logs in
- [ ] Set user properties after authentication
- [ ] Track logout events and reset analytics

## 📚 Documentation

- **Quick Start**: `docs/FIREBASE_QUICK_START.md`
- **Detailed Setup**: `docs/FIREBASE_SETUP.md`
- **Implementation Guide**: `docs/FIREBASE_ANALYTICS_IMPLEMENTATION.md`
- **Usage Examples**: `docs/ANALYTICS_USAGE_EXAMPLES.md`
- **Summary**: `docs/FIREBASE_ANALYTICS_SUMMARY.md`

## 🎉 You're Done!

Once all steps are complete, Firebase Analytics will be tracking events across all your apps!


