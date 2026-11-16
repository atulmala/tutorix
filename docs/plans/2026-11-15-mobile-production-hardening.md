---
title: Mobile production hardening (Android and iOS)
status: in-progress
jira: TUTORIX-97
created: 2026-11-15
---

# Mobile production hardening (Android and iOS)

## Goal

Make every release binary of `apps/mobile` safe to ship regardless of how it was built (script, Gradle, or Xcode archive). Fix the gaps found in the production audit: non-production URLs leaking into iOS archives, unencrypted auth token storage, hand-maintained version numbers, disabled R8, noisy release logs, silent signing fallback, and dev-only iOS settings.

Out of scope: release CI/Fastlane automation, new features, Apple IAP / Play Billing.

## 1. Production URLs in every release bundle

Today production URLs load only when `TUTORIX_STORE_BUILD=1` is set at Metro bundle time (`apps/mobile/metro.config.js` -> `load-store-env.cjs`). An Xcode GUI archive skips this and inlines the root `.env`.

- iOS: in the "Bundle React Native code and images" build phase (`apps/mobile/ios/Mobile.xcodeproj/project.pbxproj`), export `TUTORIX_STORE_BUILD=1` when `$CONFIGURATION` is `Release`.
- Android: set `TUTORIX_STORE_BUILD=1` for release bundle tasks in `apps/mobile/android/app/build.gradle` so plain `./gradlew bundleRelease` behaves like the script.
- Backstop in JS: in `libs/shared-graphql/src/client/mobile/endpoint.ts`, non-dev builds accept only allow-listed production hosts (`www.tutorix.tech`), otherwise fall back to `PRODUCTION_MOBILE_GRAPHQL_ENDPOINT`. Apply the same rule to `legalOrigin()` in `apps/mobile/src/app/config.ts`.
- Extend `endpoint.spec` tests: release + HTTPS staging host resolves to production.

## 2. Auth token in secure storage

`libs/shared-graphql/src/client/mobile/token-storage.ts` stores the JWT in AsyncStorage (plain text) and logs on success.

- Reimplement `getAuthToken` / `setAuthToken` / `removeAuthToken` with `react-native-keychain` (already used in `apps/mobile/src/app/lib/biometric-auth.ts`), dedicated service `tutorix.auth`, accessible `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. Keep the public API unchanged so callers do not change.
- One-time migration: on `getAuthToken`, if Keychain is empty and AsyncStorage has `auth_token`, move it to Keychain and delete the AsyncStorage key, so upgrading users stay signed in.
- Remove the success/verification logs.
- Add a spec with mocked Keychain and AsyncStorage covering read, write, remove, and migration.

## 3. Single source for the app version

Version lives in `APP_VERSION` (`apps/mobile/src/app/config.ts`), Android `versionCode`/`versionName`, iOS `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` (app and ScreenShare targets), and `latest_version` default in `apps/mobile/src/lib/remote-config.ts`.

- Add `scripts/mobile-bump-version.mjs` (`patch|minor|major|build`) that updates all of the above together; always increments the build number.
- npm script `mobile:version:bump`.
- Add a jest test that parses `build.gradle` and `project.pbxproj` and fails if they disagree with `APP_VERSION`.

## 4. Enable R8 on Android release

- Set `enableProguardInReleaseBuilds = true` (and `shrinkResources`).
- Add keep rules in `apps/mobile/android/app/proguard-rules.pro` for Agora RTC/RTM, Netless whiteboard, Cashfree, Razorpay, Firebase, and react-native-keychain.
- Confirm the Crashlytics Gradle plugin uploads the mapping file for release.

## 5. Strip debug logging from release JS

- Add `babel-plugin-transform-remove-console` to the mobile Babel config for production, keeping `console.error` and `console.warn`.
- Drop the endpoint/client-created logs in `libs/shared-graphql/src/client/mobile/apollo-client.ts` and `endpoint.ts` (or guard with `__DEV__`).

## 6. Fail fast on missing release signing

In `apps/mobile/android/app/build.gradle`, if a release task is requested and any `TUTORIX_UPLOAD_*` value is missing, throw a `GradleException` naming the missing keys instead of producing an unsigned bundle.

## 7. Remove dev-only iOS settings from Release

- Add a Release-only build step that deletes `NSAppTransportSecurity:NSAllowsLocalNetworking` and `NSLocalNetworkUsageDescription` from the built `Info.plist` (PlistBuddy on `$TARGET_BUILD_DIR/$INFOPLIST_PATH`).
- After the first App Store listing exists, set the real `ios_store_url` in Firebase Remote Config and update `IOS_APP_STORE_URL` in `config.ts`.

## 8. Readable crash reports

- Ensure Release uses `DEBUG_INFORMATION_FORMAT = dwarf-with-dsym` and the existing "[RNFB] Crashlytics Configuration" phase uploads dSYMs.
- Verify with a forced test crash on a release build for both platforms that the stack trace is symbolicated in the Crashlytics console.

## Implementation notes

- Android forces the store env through `react { nodeExecutableAndArgs }` in `app/build.gradle`; only release variants are bundled, so debug builds are unaffected.
- Release console stripping is an inline Babel plugin in `apps/mobile/.babelrc.js` (same pattern as the env-inlining plugin) instead of a new `babel-plugin-transform-remove-console` dependency.
- Enabling R8 activates Crashlytics mapping upload, which requires `com.google.gms:google-services` 4.4.1+; bumped to 4.4.2.
- `react-native-keychain` is pinned to the `apps/mobile` copy in `metro.config.js` so `libs/shared-graphql` resolves the same module.

## Verification

- `npm run test:mobile` and shared-graphql tests pass; `npm run lint:mobile` clean.
- `npm run mobile:store:android` and an Xcode Release archive (without setting the env var manually) both log the production GraphQL endpoint.
- Install a release build over the current 1.0.0 build: user stays signed in (token migration), login/logout works, Razorpay and Cashfree checkout open, an online class connects (R8 keep rules), push arrives.
- `strings` on the bundled JS shows no dev/staging hosts.
