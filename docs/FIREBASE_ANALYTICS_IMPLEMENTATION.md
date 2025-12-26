# Firebase Analytics Implementation Guide

This guide covers the complete implementation of Firebase Analytics across all Tutorix applications.

## 📋 Prerequisites

1. Complete the Firebase project setup (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))
2. Have Firebase configuration values ready

## 📦 Installation

### Step 1: Install Firebase Packages

```bash
# Install Firebase SDK for Web apps
npm install firebase

# Install Firebase SDK for React Native Mobile
npm install @react-native-firebase/app @react-native-firebase/analytics

# For iOS, you'll need to run pod install
cd apps/mobile/ios && pod install && cd ../../..
```

### Step 2: Add Firebase Configuration Files

#### For Mobile iOS:
1. Download `GoogleService-Info.plist` from Firebase Console
2. Add it to `apps/mobile/ios/Mobile/`
3. Open `apps/mobile/ios/Mobile.xcworkspace` in Xcode
4. Drag `GoogleService-Info.plist` into the project (ensure it's added to the Mobile target)

#### For Mobile Android:
1. Download `google-services.json` from Firebase Console
2. Place it in `apps/mobile/android/app/`
3. The build system will automatically pick it up

### Step 3: Configure Environment Variables

Add Firebase configuration to your `.env` file (create if it doesn't exist):

```env
# Firebase Web App Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_web_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Note**: For Vite-based apps (web, web-admin), environment variables must be prefixed with `VITE_` to be accessible in the browser.

### Step 4: Update Android Configuration

Edit `apps/mobile/android/build.gradle`:

```gradle
buildscript {
    dependencies {
        // Add this line
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

Edit `apps/mobile/android/app/build.gradle`:

```gradle
// Add at the bottom of the file
apply plugin: 'com.google.gms.google-services'
```

## 🚀 Usage Examples

### Web Apps (React)

#### Track Page Views
```tsx
import { usePageTracking } from './hooks/useAnalytics';

function HomePage() {
  usePageTracking('/home', 'Home Page');
  
  return <div>Home</div>;
}
```

#### Track Events in Components
```tsx
import { useAnalytics } from './hooks/useAnalytics';

function TutorCard({ tutorId }) {
  const { analytics } = useAnalytics();

  const handleView = () => {
    analytics.trackTutorViewed(tutorId);
  };

  return <button onClick={handleView}>View Tutor</button>;
}
```

#### Set User Properties After Login
```tsx
import { setUserProperties, setUserId } from './lib/analytics';

// After successful login
setUserId(user.id);
setUserProperties({
  user_id: user.id,
  user_role: user.role,
  email: user.email,
});
```

#### Track Authentication Events
```tsx
import { analytics } from './lib/analytics';

// After registration
analytics.trackRegistration('email', 'STUDENT');

// After login
analytics.trackLogin('mobile', 'TUTOR');

// On logout
analytics.trackLogout();
resetAnalytics();
```

### Mobile App (React Native)

#### Track Screen Views
```tsx
import { useScreenTracking } from './hooks/useAnalytics';

function HomeScreen() {
  useScreenTracking('Home', 'HomeScreen');
  
  return <View>...</View>;
}
```

#### Track Events
```tsx
import { useAnalytics } from './hooks/useAnalytics';

function TutorListScreen() {
  const { analytics } = useAnalytics();

  const handleSearch = (searchTerm: string) => {
    analytics.trackTutorSearch(searchTerm);
  };

  return <View>...</View>;
}
```

### Backend API (NestJS) - Optional

For server-side event tracking, you can use Firebase Admin SDK:

```typescript
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAnalytics } from 'firebase-admin/analytics';

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// Track server-side events
const analytics = getAnalytics();
await analytics.logEvent({
  name: 'server_event',
  params: {
    event_type: 'payment_processed',
    user_id: userId,
  },
});
```

## 📊 Event Definitions

All available events are defined in `apps/api/src/app/common/analytics/types.ts`:

### User Events
- `USER_REGISTERED` - When a user registers
- `USER_LOGIN` - When a user logs in
- `USER_LOGOUT` - When a user logs out
- `USER_PROFILE_UPDATED` - When a user updates their profile

### Navigation Events
- `PAGE_VIEW` - Web page viewed
- `SCREEN_VIEW` - Mobile screen viewed
- `NAVIGATION` - Navigation between pages/screens

### Action Events
- `BUTTON_CLICK` - Button clicked
- `LINK_CLICK` - Link clicked
- `FORM_SUBMIT` - Form submitted

### Error Events
- `ERROR` - Generic error
- `EXCEPTION` - Exception/exception occurred

### Business Events
- `TUTOR_SEARCH` - Tutor search performed
- `TUTOR_VIEWED` - Tutor profile viewed
- `TUTOR_BOOKED` - Tutor booking completed
- `CLASS_CREATED` - Class created
- `CLASS_JOINED` - Class joined
- `PAYMENT_INITIATED` - Payment process started
- `PAYMENT_COMPLETED` - Payment completed

## 🔧 Integration with Authentication

### After User Registration/Login

```typescript
// In your auth service or component
import { setUserId, setUserProperties, analytics } from './lib/analytics';

// After successful registration
async function handleRegistration(user) {
  setUserId(user.id);
  setUserProperties({
    user_id: user.id,
    user_role: user.role,
    email: user.email || undefined,
    mobile: user.mobile || undefined,
    is_email_verified: user.isEmailVerified,
    is_mobile_verified: user.isMobileVerified,
  });
  
  analytics.trackRegistration(
    user.role === 'ADMIN' ? 'email' : 'mobile',
    user.role
  );
}

// After successful login
async function handleLogin(user) {
  setUserId(user.id);
  setUserProperties({
    user_id: user.id,
    user_role: user.role,
  });
  
  analytics.trackLogin(
    user.role === 'ADMIN' ? 'email' : 'mobile',
    user.role
  );
}

// On logout
function handleLogout() {
  analytics.trackLogout();
  resetAnalytics();
}
```

## 📱 Mobile App Setup (Detailed)

### iOS Setup

1. **Add GoogleService-Info.plist**:
   - Download from Firebase Console
   - Drag into Xcode project under `Mobile` folder
   - Ensure "Copy items if needed" is checked
   - Select "Mobile" target

2. **Update Podfile**:
   The Firebase pods should be automatically linked, but verify:
   ```bash
   cd apps/mobile/ios
   pod install
   ```

3. **Update Info.plist**:
   - Open `apps/mobile/ios/Mobile/Info.plist`
   - Add if needed: Firebase will handle most configuration automatically

### Android Setup

1. **Add google-services.json**:
   - Download from Firebase Console
   - Place in `apps/mobile/android/app/`
   - Ensure the file is named exactly `google-services.json`

2. **Update build.gradle files**:
   - Project-level: Add Google Services classpath (see Step 4 above)
   - App-level: Apply Google Services plugin (see Step 4 above)

3. **Rebuild the app**:
   ```bash
   cd apps/mobile/android
   ./gradlew clean
   ```

## ✅ Verification

### Web Apps
1. Start the web app: `npm run serve:web`
2. Open browser console
3. Look for: `✅ Firebase Analytics initialized`
4. Check Network tab for Firebase Analytics requests

### Mobile App
1. Run the app: `npm run mobile:ios` or `npm run mobile:android`
2. Check console logs for: `✅ Firebase Analytics initialized (Mobile)`
3. Use Firebase DebugView to see events in real-time:
   - Enable DebugView in Firebase Console
   - Run: `adb shell setprop debug.firebase.analytics.app com.mobile` (Android)
   - Or use Firebase DebugView for iOS

## 🎯 Next Steps

1. **Integrate with Auth**: Track login/registration events
2. **Track Navigation**: Add page/screen tracking to routes
3. **Track Business Events**: Add tracking for key user actions
4. **Set Up Dashboards**: Create dashboards in Firebase Console
5. **Set Up Alerts**: Configure alerts for important events

## 📚 Additional Resources

- [Firebase Analytics Documentation](https://firebase.google.com/docs/analytics)
- [React Native Firebase Documentation](https://rnfirebase.io/)
- [Firebase Console](https://console.firebase.google.com/)


