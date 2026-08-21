---
title: Brand icons and splash screens
status: in-progress
jira: TUTORIX-69
created: 2026-08-21
labels:
  - cursor-plan
  - implementation-plan
---

# Brand icons and splash screens

Wire the Tutorix logo and splash PNGs in `icons/` into the mobile home-screen icon, native launch screens, in-app splash, and web/admin favicons, generated from a single Sharp script so assets stay regenerable.

Use the two new brand files in `icons/`:

- `icons/Tutorix logo with refined teal and blue.png` — source for **app icon** and **favicons** (crop to the graphic mark; wordmark is unreadable at icon size)
- `icons/Tutorix splash screen for connected learning.png` — source for **native launch** and **in-app splash**

Leave `icons/ChatGPT Image Aug 18, 2026, 06_58_24 PM.png` unused (older illustrated concept).

## Current gaps

- iOS `AppIcon.appiconset/Contents.json` lists sizes but has **no PNG files**
- Android references `@mipmap/ic_launcher` / `ic_launcher_round` but **no mipmap resources exist** in the repo
- iOS `LaunchScreen.storyboard` still shows "Mobile" / "Powered by React Native"
- JS `SplashScreen.tsx` is text + spinner only
- Web/admin point at `/favicon.ico` but **no favicon files exist**; titles are still "Web" / "Tutorix Admin"
- Home-screen name is still **Mobile** (`app.json`, `strings.xml`, iOS `CFBundleDisplayName`)

Do **not** rename the React Native component `"Mobile"` in `MainActivity` / `app.json` `name` — that would break native registration.

## 1. Stabilize source files and add a generator

Rename sources to git-friendly names:

- `icons/tutorix-logo.png`
- `icons/tutorix-splash.png`

Add `scripts/generate-brand-assets.mjs` using existing workspace `sharp`. Add npm script `generate:brand-assets`.

**Icon generation (from logo):** crop to graphic mark, generate iOS AppIcon slots and Android mipmaps plus adaptive icon.

**Splash generation (from splash PNG):** native launch screens, JS splash asset.

**Web favicons (from logo mark):** `apps/web/public/` and `apps/web-admin/public/`.

## 2. Native splash themes

Android `windowBackground` to `@drawable/launch_screen`. iOS LaunchScreen with centered splash/logo image.

## 3. In-app splash and loading UI

Update `SplashScreen.tsx` to show the splash image. Light-touch web splash in `SessionLoadingGate.tsx`.

## 4. Display names and HTML

- Mobile launcher label → **Tutorix**
- Web title **Tutorix**; admin remains **Tutorix Admin**
- PNG favicon + apple-touch-icon links

Out of scope: production Razorpay checkout logo URL.

## Verification

- Run `npm run generate:brand-assets` and confirm generated files are committed
- iOS simulator: home-screen icon + cold-launch splash
- Android emulator: square + round icons + cold-launch splash
- Web/admin: tab favicon and document title
