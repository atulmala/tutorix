---
title: Charge tutors for online-class Agora usage
status: planned
jira: null
created: 2026-10-12
---

# Charge tutors for online-class Agora usage

## Vendor cost (list price, no free allowances)

Assumptions: **1 tutor + 1 student**, **Full HD** RTC for the full session, **both use whiteboard** for the same duration.

| Service | Usage | Rate (USD) | Cost for 60 min |
| --- | --- | --- | --- |
| Video Calling (Full HD) | 2 × 60 = **120 participant-minutes** | $8.99 / 1,000 min | **$1.08** |
| Interactive whiteboard | 2 × 60 = **120 user-minutes** | $1.40 / 1,000 min | **$0.17** |
| **Total** | | | **~$1.25** |

Per calendar minute (1:1, same assumptions): **~$0.021 USD**.

Helper: [`libs/shared-utils/src/online-class-agora-cost.ts`](../../libs/shared-utils/src/online-class-agora-cost.ts).

## What to charge the tutor

Charge **vendor cost + buffer**, not the student. Suggested approaches:

1. **Pass-through + markup** — `suggestTutorOnlineClassAgoraChargeInr()` with admin-configured `usdToInrRate` and `markupRatio` (15% default covers occasional screen-share tier bumps and FX).
2. **Flat per scheduled hour** — e.g. **₹125–₹150** per 60-minute online class at ~₹85/USD with 15% buffer (list vendor ~₹106).
3. **Usage-based** — Sum `online_class_presence.duration_seconds` per session (and whiteboard join time when available) and multiply by tier rates; debit tutor wallet on `endOnlineClass`.

RTM/signaling is negligible at 1:1 scale (free-tier message volume).

## Implementation sketch (not built)

1. On successful `endOnlineClass`, compute charge from scheduled `durationMinutes` or actual presence seconds (cap at scheduled + extension).
2. `WalletService` debit with transaction type `ONLINE_CLASS_AGORA` linked to `session_id`.
3. Block join when tutor wallet balance &lt; estimated charge for upcoming session (optional).
4. Admin: FX rate + markup in config (or extend `platform_fee_config` with `ONLINE_CLASS_AGORA`).

## References

- [Video Calling pricing](https://docs.agora.io/en/video-calling/overview/pricing)
- [Whiteboard pricing](https://docs.agora.io/en/realtime-media/whiteboard/reference/pricing)
