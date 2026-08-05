---
title: Mobile wallet (balance, top-up, transactions, PT pay)
status: in-progress
jira: TUTORIX-63
created: 2026-08-05
---

# Mobile wallet (balance, top-up, transactions, PT pay)

## Goal

Bring web wallet functionality to React Native (`apps/mobile`) for onboarded users:

1. Show wallet balance from student/tutor profile
2. Standalone wallet top-up via Razorpay
3. Show wallet transaction history
4. Pay for post-onboarding proficiency test fees from wallet (with shortfall top-up)

## Context

- **API + shared GraphQL/utils already exist** — no new backend endpoints for this scope
- Web reference: `apps/web/src/app/components/wallet/` + wallet-aware PT in `TutorPT.tsx`
- Shared orchestration: `libs/shared-utils/src/wallet-checkout.ts` (`runStandaloneWalletTopUp`, `runWalletAwarePurchaseCheckout`)
- Shared ops: `MY_WALLET`, `MY_WALLET_TRANSACTIONS`, `PREPARE_WALLET_PURCHASE`, `COMPLETE_WALLET_PURCHASE`, `INITIATE_WALLET_TOP_UP`, `CONFIRM_WALLET_TOP_UP`
- Mobile today: no wallet UI; post-onboarding PT still uses direct gateway via `runPtFeePaymentCheckout` + `openMobilePaymentCheckout`
- Onboarding gate is server-side; mobile already routes onboarded users to profile screens

## Approach

### 1. Navigation

- Add `wallet` to `AppView` in `apps/mobile/src/app/App.tsx`
- From profile screens, open wallet via callback (same pattern as web `onOpenWallet`)
- Wallet screen supports back → previous profile view

### 2. Wallet UI (new mobile components)

Under `apps/mobile/src/app/components/wallet/`:

| Component | Role |
|-----------|------|
| `WalletBalanceChip` | Queries `MY_WALLET`; shows balance; hides on load/error; opens wallet |
| `WalletScreen` | Balance, transaction list (`MY_WALLET_TRANSACTIONS`), standalone top-up entry |
| `WalletTopUpModal` | Amount presets ₹500 / ₹2000 / ₹5000; min ₹500, max ₹10,000 |
| `WalletLowBalanceModal` | Shortfall message during purchase; collect top-up amount ≥ shortfall |

Reuse shared constants/helpers from `@tutorix/shared-utils` (`WALLET_STANDALONE_TOP_UP_*`, `formatWalletLowBalanceMessage`, validators).

Match existing mobile payment UX patterns (registration fee screens), not web DOM/CSS.

### 3. Profile entry points

- `TutorDetailScreen` / `StudentDetailScreen`: render chip when `onOpenWallet` is provided
- Wire `onOpenWallet` from `App.tsx` only for onboarded profile views (already the only path to those screens)

### 4. Standalone top-up

On confirm in `WalletTopUpModal`:

```ts
await runStandaloneWalletTopUp(
  amountInr,
  initiateWalletTopUp,
  confirmWalletTopUp,
  openMobilePaymentCheckout, // RN bridge — do not use web openPaymentCheckout
);
```

Then refetch wallet + transactions.

### 5. Wallet-aware PT payment

Update `apps/mobile/src/app/components/tutor-onboarding/tutor-pt/TutorPT.tsx` to mirror web:

- **Onboarding PT** (`context === 'onboarding'`): leave fee/wallet path unchanged (no wallet pay)
- **Post-onboarding PT**: replace `runPtFeePaymentCheckout` with `runWalletAwarePurchaseCheckout`
  - Intent: `{ itemType: 'PROFICIENCY_TEST', referenceType: 'tutor_offering', referenceId }`
  - If `canPayFromWallet` → `completeWalletPurchase`
  - Else → `WalletLowBalanceModal` → top-up with `purchaseIntent` → confirm (purchase completes with top-up)
  - Pass `openMobilePaymentCheckout` as `openCheckout`

### 6. Testing

- Unit: keep relying on existing `wallet-checkout.spec.ts` for orchestration
- Manual / Detox smoke (as practical):
  - Onboarded tutor/student: chip visible with balance
  - Pre-onboarding: wallet not reachable / chip not shown
  - Standalone top-up (test Razorpay key)
  - Transaction list updates after credit/debit
  - Post-onboarding PT: full balance pay + shortfall top-up path

## Out of scope

- Class booking wallet pay (`CLASS_BOOKING` typed but not resolved in API `resolvePurchase`; no mobile booking UI yet)
- Unlocking live Razorpay keys on mobile (still test-key gated in `payment-checkout.native.ts`)
- Shared `wallet-ui` package across web/mobile
- Admin wallet changes
- New API / schema work

## Delivery order

1. `wallet` view + chip on profiles + `WalletScreen` (balance + txs)
2. Standalone top-up via `openMobilePaymentCheckout`
3. Wire post-onboarding PT to wallet-aware checkout + low-balance modal
4. Smoke-test the three happy paths above

## Key files

| Area | Path |
|------|------|
| Nav | `apps/mobile/src/app/App.tsx` |
| Profiles | `TutorDetailScreen.tsx`, `StudentDetailScreen.tsx` |
| New UI | `apps/mobile/src/app/components/wallet/*` |
| PT pay | `apps/mobile/.../tutor-pt/TutorPT.tsx` |
| Checkout | `apps/mobile/src/lib/mobile-payment-checkout.ts` |
| Shared (reuse) | `libs/shared-graphql` wallet ops, `libs/shared-utils/src/wallet-checkout.ts` |
| Web reference | `apps/web/src/app/components/wallet/*`, web `TutorPT.tsx` |
