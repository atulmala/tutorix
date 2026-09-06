# Tutorix store listing and reviewer notes

Use this when submitting `apps/mobile` (`com.tutorix.tech`, version `1.0.0`) to Google Play and the App Store. Payments stay **Razorpay only**. Do not create Apple IAP or Play Billing products for v1.

## Public URLs

| Item | URL |
|------|-----|
| Website | https://www.tutorix.tech |
| Privacy | https://www.tutorix.tech/privacy |
| Terms | https://www.tutorix.tech/terms |
| Support email | info@tutorix.tech |
| Play listing (after publish) | https://play.google.com/store/apps/details?id=com.tutorix.tech |
| App Store listing | Paste the numeric `idXXXXXXXX` URL after the first listing exists |

## Store binaries (production GraphQL)

Release JS must talk to `https://www.tutorix.tech/api/graphql`. Do **not** archive from a Metro session that only loaded local `.env`.

```bash
npm run mobile:store:android   # AAB → apps/mobile/android/app/build/outputs/bundle/release/
npm run mobile:store:ios       # Release iOS build
```

Both set `TUTORIX_STORE_BUILD=1`, which overlays [`apps/mobile/.env.store`](../apps/mobile/.env.store) so Babel inlines production GraphQL and `https://www.tutorix.tech` legal links.

Safety net: if a release binary still has a localhost env value, [`getGraphQLEndpoint`](../libs/shared-graphql/src/client/mobile/endpoint.ts) ignores it and uses production HTTPS.

If you archive from Xcode, add `TUTORIX_STORE_BUILD=1` to the Release scheme environment, or rely on that release fallback.

Upload an **AAB**, not an APK. Confirm the 16 KB page-size requirement on the Play pre-launch report.

## Firebase Remote Config

Console → Remote Config. After the first store listings exist, publish:

| Key | Value |
|-----|--------|
| `android_store_url` | `https://play.google.com/store/apps/details?id=com.tutorix.tech` |
| `ios_store_url` | `https://apps.apple.com/app/idXXXXXXXX` (replace after App Store Connect assigns the ID) |
| `min_supported_version` | `1.0.0` until you need a force update |
| `latest_version` | bump when a newer store version is live |

In-app defaults already use the Play package URL and `https://apps.apple.com/app/tutorix`. The iOS default is a stand-in until the numeric ID exists. Import [`docs/firebase/remote-config-template.json`](./firebase/remote-config-template.json) if you recreate the project.

## Reviewer notes (paste into both consoles)

Tutorix is a marketplace that connects students with tutors for **live, real-world tutoring** (in person or live sessions). It does not sell digital content, subscriptions, coins, or features unlocked inside the app.

Registration fees and wallet top-ups pay for **services consumed outside the app** (tutor onboarding, student onboarding, and tutoring fees). Checkout uses **Razorpay** (UPI, cards, netbanking). There are no Apple In-App Purchase products and no Google Play Billing products in this version.

Guideline fit: Apple **3.1.3(e)** — goods and services used outside the app. If review cites **3.1.1**, reply with that exception. Do not add IAP unless review requires it.

Demo accounts (create these on **production** before submit and fill the passwords here):

- Tutor: `reviewer-tutor@tutorix.tech` / ________
- Student: `reviewer-student@tutorix.tech` / ________

Support URL for reviewers: https://www.tutorix.tech/privacy

## App Store Connect

- Category: Education.
- Support URL: https://www.tutorix.tech/privacy
- Privacy policy: https://www.tutorix.tech/privacy
- Marketing URL: https://www.tutorix.tech
- Screenshots: 6.7" required. Do not include IAP screens.
- Privacy nutrition labels: match [`PrivacyInfo.xcprivacy`](../apps/mobile/ios/Mobile/PrivacyInfo.xcprivacy) — contact info, physical address, payment/bank details, photos and documents, user ID, device ID, crash data, product interaction. No tracking. No precise or coarse device location (address is typed / Places HTTP).
- Export compliance: `ITSAppUsesNonExemptEncryption` is false (HTTPS only).
- Age rating: 4+ / education. No user-generated public social feed.
- Do **not** create IAP products.

## Google Play Console

- App category: Education.
- Privacy policy: https://www.tutorix.tech/privacy
- Data safety: same categories as the privacy labels above (account info, financial, photos/files, device/app IDs, crash and analytics). Collected for app functionality / analytics. Not sold. Encrypted in transit.
- Photos and videos declaration: camera and library are used for profile photos and identity/qualification documents. Camera hardware is **not required**.
- IARC rating questionnaire: education / tutoring.
- Play Billing: **not** used. Payments go through Razorpay for real-world services.
- Upload AAB (`com.tutorix.tech`).

## If Apple rejects on payments

Reply with 3.1.3(e) and the reviewer notes above. If they still require IAP, stop and implement the deferred IAP work in the store-publish plan — do not add Play Billing or IAP preemptively.
