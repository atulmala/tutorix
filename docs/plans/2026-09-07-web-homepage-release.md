---
title: Web homepage ready for release
status: done
jira: TUTORIX-77
created: 2026-09-07
labels:
  - cursor-plan
  - implementation-plan
---

# Web homepage ready for release

Replace the signup-focused web homepage with a slightly colorful, dual-audience marketing page: a shared brand intro, then equal Student and Tutor columns that carry the Tutorix philosophy. Structure it so later sections can be added without rewriting the page.

## Current state

[`HomeScreen.tsx`](apps/web/src/app/components/HomeScreen.tsx) is a compact onboarding pitch (“guided four-step sign-up”, registration preview). It does not sell the marketplace. Routing stays as-is: [`app.tsx`](apps/web/src/app/app.tsx) still renders `HomeScreen` for view `'home'` with existing Login / Sign up / logout / signup-success banner.

## Page structure

Split hero as requested. Shared intro sits above two equal columns. Components live under `apps/web/src/app/components/home/` so later sections (how it works, screenshots, store badges) can be inserted below without touching signup wiring.

**Header:** logo image (`/tutorix-logo.png`) + Tutorix wordmark; keep existing Login / Sign up (or name + Logout when signed in).

**Shared intro (narrow, above the split):**
- Eyebrow: Connect, Learn, Grow
- Headline: Tutors beyond your neighbourhood. A teaching practice that grows.
- One-line sub: Tutorix matches students with certified tutors on cost, timings, and learning style — and helps tutors teach more students.

**Students column** (sky-blue tint, brand CTA blue `#5fa8ff`):
- Headline: Get tutors beyond your neighbourhood
- Sub: Suit your cost, timings, and learning style — not just whoever lives nearby.
- Bullets:
  - Why restrict yourself to the tutor in your neighbourhood?
  - Choose from a vast pool of certified tutors at affordable prices
  - Study online or offline
  - Learn in a batch or one-on-one
  - Manage it in a user-friendly app: schedule and reminders for upcoming classes
- CTA: I’m a student → existing `onSignUp` (role is still chosen in signup)

**Tutors column** (teal/green tint using brand `#1FBBA6` / `primaryAccent` `#16a34a`):
- Headline: Teach more. Earn more.
- Sub: Expand your teaching profession and reach more students.
- Bullets:
  - Assured class bookings
  - Timely payments
  - Track your schedule and get reminders for upcoming classes
  - Teach offline or online with the built-in online class feature
- CTA: I’m a tutor → existing `onSignUp`

**Footer:** keep Privacy / Terms; add `info@tutorix.tech`. Drop the registration-preview card.

On small screens, stack Students then Tutors. Header CTAs stay sticky-simple (no new nav).

## Color (slightly colorful, not loud)

Keep navy text `#143055` and splash-page background `#E9F5FE`. Distinguish audiences with tinted cards, accent bars, and small icon chips — not a rainbow palette or stock photos.

- Page: white → `#E9F5FE` (matches splash / loading gate)
- Student card: blue border/fill (`#e8f1ff` / `#5fa8ff`)
- Tutor card: teal/green border/fill (`#e6f7f4` / `#1FBBA6`)
- Soft decorative blobs behind the split (low-opacity circles) for warmth
- No new design tokens unless a color is reused 3+ times; prefer Tailwind + existing tokens

## Copy and SEO

- Replace onboarding-centric copy; keep voice practical and marketplace-oriented (live tutoring, certified tutors, online/offline).
- [`index.html`](apps/web/index.html): add meta description, e.g. “Tutorix connects students with certified tutors beyond the neighbourhood — match on cost, timings, and learning style. Tutors, teach more and earn more.”
- No Play/App Store badges yet (listings not live). Mention the app in copy only; badges are a later expansion.

## Files

- Split [`HomeScreen.tsx`](apps/web/src/app/components/HomeScreen.tsx) into:
  - `home/HomeScreen.tsx` — composition + signup-success banner
  - `home/HomeHeader.tsx`
  - `home/HomeHero.tsx` — intro + two `HomeAudienceCard`s
  - `home/HomeAudienceCard.tsx` — reusable column
  - Re-export from `components/HomeScreen.tsx` or update the [`app.tsx`](apps/web/src/app/app.tsx) import
- Lightly extend [`LegalFooter.tsx`](apps/web/src/app/components/LegalFooter.tsx) or wrap it in `HomeFooter` with support email
- Add a small `HomeScreen` test for headlines and both CTAs (today `app.spec.tsx` mocks the whole screen)

## Out of scope

- Pre-selecting Student/Tutor on the signup form
- URL routes for `/students` / `/tutors`
- Mobile in-app home
- Store download badges
- Extra sections below the split (placeholder comment only)

## Verification

- Exercise Login, Sign up, both column CTAs, logout, and the signup-success banner
- Check stacked layout at a mobile viewport and two-column layout at desktop
- Confirm legal links and support email
