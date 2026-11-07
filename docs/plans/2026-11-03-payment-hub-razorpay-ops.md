# Razorpay setup for admin payment processing hub

Reference for enabling outbound payments configured in Tutorix.

## Student gateway refunds

Uses the standard Razorpay **Payment Refunds** API (original payment method). No RazorpayX required.

- Ensure test vs live API keys match the environment (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
- Maintain sufficient Razorpay balance for refunds.
- Webhook URL remains `/{apiPrefix}/webhooks/razorpay` for inbound payments; refund completion is polled/synced from the hub.

## Student wallet refunds

Internal wallet ledger only; no Razorpay outbound call.

## Tutor bank payouts (RazorpayX)

1. Enable **RazorpayX** on the merchant account and complete KYC.
2. Fund the RazorpayX account (`RAZORPAYX_ACCOUNT_NUMBER` in env).
3. Set `TUTOR_PAYOUT_RAZORPAYX_ENABLED=true` when ready on staging/production.
4. Add webhook events on the same Razorpay webhook: `payout.processed`, `payout.failed`, `payout.reversed`.
5. Use RazorpayX test contacts/fund accounts in test mode.
6. Confirm payout **purpose** code with finance/CA (`RAZORPAYX_PAYOUT_PURPOSE`).

## Admin workflow

- **Class cancellation / post-class claims:** approval and AI analysis stay on those screens; execution only on **Payment processing**.
- **Tutor pay:** run calculation, **Submit for payment**, then execute per-tutor disbursements on **Payment processing**.
