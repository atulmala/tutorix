# Submit Tutorix iOS to App Store Connect

Bundle **`com.tutorix.tech`**, version **1.0.0** (build **6**). Team **5PQ69FYJ9J**.

Listing copy, reviewer notes, and URLs: [`STORE_LISTING.md`](./STORE_LISTING.md).

## Before you archive

1. **Production web** live: `/privacy`, `/terms`, `/delete-account` on https://www.tutorix.tech
2. **App Store Connect** app record created for `com.tutorix.tech`
3. **Demo passwords** ready for App Review (emails in STORE_LISTING)
4. **No IAP products** in App Store Connect for v1
5. **Firebase**: Production APNs auth key uploaded (App Store / TestFlight uses production)
6. Open workspace: `apps/mobile/ios/Mobile.xcworkspace` (not `.xcodeproj` alone)

## Build the release archive

Release archives set `TUTORIX_STORE_BUILD=1` in the Xcode bundle phase so JS inlines production GraphQL and legal URLs.

### Option A — Xcode (recommended for upload)

1. `cd apps/mobile/ios && pod install` if pods changed
2. Open **Mobile.xcworkspace** in Xcode
3. Scheme **Mobile**, destination **Any iOS Device** (not a simulator)
4. **Product → Archive**
5. When Organizer opens: **Distribute App** → **App Store Connect** → **Upload**
6. Accept defaults (symbols, bitcode off as applicable); upload with your Apple ID

### Option B — CLI (validate only; upload still via Organizer or Transporter)

```bash
export TUTORIX_STORE_BUILD=1
cd apps/mobile/ios
xcodebuild archive \
  -workspace Mobile.xcworkspace \
  -scheme Mobile \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/Mobile.xcarchive
```

Then upload `build/Mobile.xcarchive` with **Xcode → Organizer** or the [Transporter](https://apps.apple.com/app/transporter/id1450874784) app.

## App Store Connect — version 1.0.0

| Field | Value |
|-------|--------|
| Privacy policy | https://www.tutorix.tech/privacy |
| Support URL | https://www.tutorix.tech/privacy |
| Marketing URL | https://www.tutorix.tech |
| Category | Education |
| **App Review** sign-in | Student and/or tutor — **email + password only** (see STORE_LISTING) |
| Account deletion | In app: Account → Delete account; web: https://www.tutorix.tech/delete-account |

Paste **Reviewer notes** from `STORE_LISTING.md` (marketplace, Razorpay, 3.1.3(e), demo accounts).

### Screenshots

- Minimum: **6.7"** iPhone (1290×2796 or Apple’s current spec in Connect)
- Use production UI; avoid Razorpay test-key screens if possible

### App Privacy (nutrition labels)

Align answers with [`apps/mobile/ios/Mobile/PrivacyInfo.xcprivacy`](../apps/mobile/ios/Mobile/PrivacyInfo.xcprivacy): contact info, address, financial/bank, photos/docs, user ID, device ID, diagnostics, product interaction; **not** used for tracking; **no** precise location.

### Export compliance

`ITSAppUsesNonExemptEncryption` is **false** in Info.plist → answer **No** to proprietary encryption (HTTPS only).

### Age rating

Education / tutoring; no unrestricted public UGC feed. Answer the questionnaire honestly (payments, account creation, etc.).

## After Apple assigns the App Store ID

1. Firebase Remote Config → `ios_store_url`: `https://apps.apple.com/app/idXXXXXXXX`
2. Optional: update `IOS_APP_STORE_URL` in `apps/mobile/src/app/config.ts` in a later release

## TestFlight (optional)

Upload the same archive → **TestFlight** internal testing → smoke sign-in, book/join flows, then **Submit for Review** on the version.

## If rejected on payments (3.1.1)

Reply with **3.1.3(e)** and STORE_LISTING reviewer text. Do not add IAP unless Apple requires it.

## Validation troubleshooting

### Missing iPad icons (152×152, 167×167)

The Xcode target is **iPhone + iPad** (`TARGETED_DEVICE_FAMILY = 1,2`). The App Icon set must include iPad slots (76pt @2x = 152px, 83.5pt @2x = 167px). Regenerate from the repo logo:

```bash
npm run generate:brand-assets
```

Then **Product → Clean Build Folder** and archive again.

### “Upload Symbols Failed” for Agora, Razorpay, Hermes, etc.

Prebuilt vendor **xcframeworks** often ship **without** dSYM. This is a **warning**, not a blocker for App Store upload. Your app’s own dSYM (Mobile.app) is still uploaded for Crashlytics.

- You can **continue upload** after fixing real validation errors.
- In Organizer → Distribute, leaving **“Upload your app’s symbols”** enabled may list these warnings; they do not mean the binary is invalid.
- Native crashes inside Agora/Razorpay prebuilts are rarely symbolicated by Apple; Firebase still symbolicates **your** app frames.