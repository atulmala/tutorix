# Firebase Package Installation

Install the required Firebase packages for all platforms.

## Installation Commands

### 1. Install Firebase for Web Apps

```bash
npm install firebase
```

### 2. Install Firebase for React Native Mobile

```bash
npm install @react-native-firebase/app @react-native-firebase/analytics
```

### 3. iOS Setup (React Native)

```bash
cd apps/mobile/ios
pod install
cd ../../..
```

### 4. Android Setup (React Native)

#### Update `apps/mobile/android/build.gradle`:

Add this inside the `buildscript` → `dependencies` block:

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'  // Add this line
    }
}
```

#### Update `apps/mobile/android/app/build.gradle`:

Add this at the very bottom of the file:

```gradle
apply plugin: 'com.google.gms.google-services'
```

## Verify Installation

After installation, verify packages are installed:

```bash
npm list firebase
npm list @react-native-firebase/app
npm list @react-native-firebase/analytics
```

## Next Steps

1. Complete Firebase project setup (see FIREBASE_SETUP.md)
2. Add configuration files (GoogleService-Info.plist for iOS, google-services.json for Android)
3. Add environment variables to .env file
4. Test the integration


