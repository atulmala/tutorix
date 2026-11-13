---
title: Admin-controlled payment gateway and tutor payout provider
status: in-progress
jira: TUTORIX-96
---

# Admin-controlled payment gateway and tutor payout provider

## Goal

Move the choice of payment providers out of `.env` and into the admin app:

- **Student payment gateway** (collections and refunds for new orders): Razorpay or Cashfree. Replaces `PAYMENT_GATEWAY`.
- **Tutor payout provider** (bank transfers to tutors): RazorpayX or Cashfree Payouts. Replaces `TUTOR_PAYOUT_PROVIDER`.

The admin setting is the only source of truth. Both env vars are ignored and removed from the docs. Defaults when nothing has been saved: Razorpay and RazorpayX, which matches today's behaviour, so deploying this changes nothing until an admin switches.

Credentials (`RAZORPAY_*`, `RAZORPAYX_*`, `CASHFREE_*`) stay in `.env` / AWS Secrets Manager. Admin only chooses between providers whose credentials are already configured.

## Ground rules

- Razorpay and RazorpayX gateway classes, webhooks, settlement batches and payout code stay unchanged. Only the *selection* logic and its call sites change.
- A provider switch affects new orders and new payouts only. Anything already in flight finishes on the provider it started on.

## Design

### 1. Storage

Reuse the existing singleton row in `payment_gateway_fee_settings` (already edited from the admin Fees & Charges page).

- Migration (additive): `active_payment_gateway varchar(32) not null default 'razorpay'` and `tutor_payout_provider varchar(32) not null default 'razorpayx'`.
- `PaymentGatewayFeeSettingsEntity`: add both columns.
- New `PaymentProviderSelectionService` in the `payment-gateway-fee` module:
  - `getSelection(): Promise<{ paymentGateway, tutorPayoutProvider }>` reads the singleton row on every call (one primary-key lookup, so multiple API instances always agree; no in-memory cache to go stale).
  - `updateSelection(...)` validates values against the allowed lists and saves.
  - Falls back to the defaults if the row or table is missing (e.g. migration not yet run).

### 2. Student payment gateway selection

- `PaymentGatewayFactory.getActiveGateway()` becomes `async`, reads `getSelection().paymentGateway` and returns that gateway. If the selected gateway's credentials are missing it returns `NoOpPaymentGateway` with a clear error (no silent fallback to the other provider). Remove the `PAYMENT_GATEWAY` read.
- New `getGatewayForProvider(provider)` returns the Razorpay or Cashfree gateway regardless of the active selection.
- Order creation call sites `await getActiveGateway()`: `checkout.service.ts`, `platform-fee-payment.service.ts` (fee order creation), `wallet-checkout.service.ts` (top-up order creation).
- **Verification uses the order's provider, not the active one.** In the three verify paths (`platform-fee-payment.service.ts` lines ~447 and ~670, `wallet-checkout.service.ts` ~331) resolve the gateway from the provider recorded on the pending payment / payment attempt (fall back to `input.provider`), via `getGatewayForProvider`. This prevents "Payment provider mismatch" for a student who started paying just before an admin switch. Refunds and webhooks already route by the stored provider; confirm and leave as is.

### 3. Tutor payout provider selection

- `CashfreePayoutGateway.isSelected()` becomes `async` and reads `getSelection().tutorPayoutProvider === 'cashfree'`; remove the `TUTOR_PAYOUT_PROVIDER` read. `CashfreeTutorPayoutService.isSelected()` and its single caller in `admin-payment-processing.service.ts` add `await`.
- Payout status sync already routes by `payment_disbursement.payout_provider`, so in-flight payouts finish on their original provider.

### 4. Admin API

- Extend `AdminPaymentGatewayFeeConfigResult` with `activePaymentGateway`, `tutorPayoutProvider`, and availability lists `paymentGatewayOptions` / `tutorPayoutOptions` (`{ provider, label, configured }`, where `configured` comes from each gateway's `isConfigured()`).
- New mutation `adminUpdatePaymentProviderSelection(input: { activePaymentGateway?, tutorPayoutProvider? })` in `admin.resolver.ts` / `admin.service.ts`. Admin-only, same guard as the other fee settings mutations. Rejects unknown values and providers whose credentials aren't configured. Logs who changed what.
- `libs/shared-graphql`: add the fields to the existing `AdminPaymentGatewayFeeConfig` query and add the new mutation.

### 5. Admin UI

New "Active payment providers" section at the top of `FeesAndChargesPage.tsx`, above "Payment gateway fees":

- Two selects: "Student payments" (Razorpay / Cashfree) and "Tutor payouts" (RazorpayX / Cashfree). Options without credentials are disabled with "(not configured)".
- Save button with a confirmation ("New student payments will use Cashfree. Payments already in progress are unaffected.").
- Show the current selection after save, matching the existing section styling.

### 6. Config and docs

- Remove `PAYMENT_GATEWAY` and `TUTOR_PAYOUT_PROVIDER` from `.env.example`, `.env.docker.example`, `docker-compose.yml` and `docs/AWS_SECRETS_MANAGER.md`; add a note that the providers are chosen in admin under Fees & Charges.
- Update the Cashfree plan's rollout steps to refer to the admin setting instead of env flags.

## Implementation notes

- The admin API is a separate query/mutation pair (`adminPaymentProviderSelection`, `adminUpdatePaymentProviderSelection`) served by `AdminPaymentProviderSelectionService` in the payment-processing module, rather than extra fields on `adminPaymentGatewayFeeConfig`. That module can reach both the payment gateways and the payout gateways, and `AdminService` stays untouched.
- "Configured" means: Razorpay / Cashfree gateway `isConfigured()`, Cashfree Payouts `isConfigured()`, RazorpayX `isEnabled()` (`TUTOR_PAYOUT_RAZORPAYX_ENABLED`). The current selection can always be kept even if it is not configured; switching *to* an unconfigured provider is rejected.
- The Razorpay order capture-status check (`getRazorpayOrderCaptureStatus`) also resolves the gateway from the pending payment's provider instead of the active one.
- Migration: `1780100000000-AddPaymentProviderSelection.ts`.

## Tests

- Unit: `PaymentProviderSelectionService` (defaults, update, validation); factory returns the selected gateway, NoOp when selected one isn't configured, and `getGatewayForProvider`; `CashfreePayoutGateway.isSelected()` follows the setting (replace the env-based spec).
- Update mocks in `checkout.service.spec.ts` and `wallet-checkout.service.spec.ts` for the async factory.
- Manual: switch to Cashfree in admin, pay on web and mobile without restarting the API; switch back to Razorpay and repeat. Start a Razorpay checkout, switch to Cashfree before paying, complete payment, confirm verification succeeds. Run a tutor payout on each provider.

## Rollout

1. Deploy; the migration defaults keep Razorpay and RazorpayX, so nothing changes.
2. Remove `PAYMENT_GATEWAY` / `TUTOR_PAYOUT_PROVIDER` from staging and production env / Secrets Manager (they're ignored either way).
3. Switch providers from admin on staging, test, then production.
