# Firebase Crashlytics Setup (Mobile)

Crashlytics is **mobile-only** (iOS + Android). Web and web-admin do not use it.

## Configuration

- Root [`firebase.json`](../firebase.json) enables Crashlytics in debug builds (emulator/simulator).
- Native config: [`google-services.json`](../apps/mobile/android/app/google-services.json) (Android `com.mobile`), [`GoogleService-Info.plist`](../apps/mobile/ios/GoogleService-Info.plist) (iOS `org.reactjs.native.example.Mobile`).
- JS wrapper: [`apps/mobile/src/lib/crashlytics.ts`](../apps/mobile/src/lib/crashlytics.ts)

After changing `firebase.json`, **rebuild the native app** — Metro reload is not enough.

## Rebuild commands

```bash
# Android emulator (starts Metro if needed, then installs + launches)
npm run mobile:android

# iOS simulator
cd apps/mobile/ios && pod install && cd ../../..
npm run mobile:ios
```

### Android emulator looks blank or shows Quick Settings?

If you see the **system notification/quick settings panel** (brightness slider, Battery Saver tiles), swipe **up** to dismiss — the app is usually running underneath. Confirm with:

```bash
adb logcat -s ReactNativeJS:* | grep -E "App imported|Running \"Mobile\""
```

You should see `App imported successfully` and `Running "Mobile"`. If Metro is not running, use `npm run mobile:android` (not `mobile:android:run` alone).

## Environment segregation (debug vs production)

Every crash report includes custom keys set at init:

| Key | Example (dev) | Example (prod) |
|-----|-----------------|----------------|
| `environment` | `development` | `production` |
| `platform` | `ios` / `android` | `ios` / `android` |
| `build_type` | `debug` | `release` |
| `app_name` | `mobile` | `mobile` |

In **Firebase Console → Crashlytics**, filter by custom key `environment = production` to hide dev/simulator noise.

Dev-only behavior (`__DEV__`):

- Startup verification non-fatal
- `crashlytics.triggerTestCrash()` / `crash()`
- `global.crashlytics` in the debugger console

Production release builds still report real crashes and non-fatals from `ErrorBoundary` / `trackError`.

## Verify in Metro logs

On app start you should see:

- `Initializing Firebase Crashlytics (Mobile)...`
- `[Crashlytics] context: { environment: 'development', build_type: 'debug', ... }`
- `[Crashlytics] collection enabled: true`
- `[Crashlytics] verification non-fatal sent (dev only)` — debug builds only

## Clear Firebase Console "Add SDK" onboarding

Firebase needs at least one uploaded report. Logs alone are not enough.

### Option A — non-fatal (automatic, dev only)

Debug builds send a verification non-fatal on startup after init. Wait 5–15 minutes, then check **Firebase Console → Crashlytics** for the correct app (filter `environment = development` to find it):

- Android: `com.mobile`
- iOS: `org.reactjs.native.example.Mobile`

### Option B — forced test crash (recommended for first setup)

In **React Native DevTools console** (do not use `import` — it fails with "requires module mode"):

```javascript
crashlytics.triggerTestCrash()
```

`crashlytics` is exposed on `global` in dev builds after startup init. Wait for the log:
`Dev: call crashlytics.triggerTestCrash() from the debugger console`

1. App crashes immediately
2. **Relaunch the app** (fatal reports upload on next start)
3. Wait 5–15 minutes
4. Refresh Crashlytics in Firebase Console

## Platform-specific logs

**Android**

```bash
adb logcat | grep -i crashlytics
```

**iOS**

Check Xcode build log for `[RNFB] Crashlytics Configuration` and RNFB plist injection lines.

## Error reporting

- React errors: [`ErrorBoundary`](../apps/mobile/src/app/components/ErrorBoundary.tsx) → `recordError`
- App code: `trackError()` in [`analytics.ts`](../apps/mobile/src/lib/analytics.ts) also sends to Crashlytics
- Login: user ID is set in Crashlytics on successful login
