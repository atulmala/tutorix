---
title: Student class booking
status: in-progress
jira: null
created: 2026-09-24
labels:
  - cursor-plan
  - implementation-plan
---

# Student booking calendar (1-hour slots)

Student books **one 1-hour class** from tutor preview. Slots are always `SLOT_DURATION_MINUTES = 60`. Tables already exist (`tutor_class_session`, enrollments); there is **no booking API or student calendar yet**. Multi-tutor cart, demo request, and join-video stay out of scope.

## Product rules

- Entry: **Book class** on web/mobile tutor preview, carrying `tutorId` + searched `offeringId`.
- Calendar shows only **future** `tutor_calendar` rows for that tutor (already materialized up to **8 weeks**).
- Each chip is one hour: `startsAt` → `startsAt + 60m` (IST labels via existing `formatSlotTimeAmPmLabel`).
- Delivery mode: if the matching offering has only one enabled mode, lock it; if both, student picks Online/Offline before confirm. Price is the **1–4 class effective rate** for that mode (`starterRateForMode` / `calculateEffectiveRate`).
- A slot is bookable when no session exists, or an **open** session for the **same offering + mode** still has `confirmed < batchSize`. Another offering already on that hour makes the slot unavailable (unique `tutor_calendar_id`).
- Confirm shows tutor, subject, mode, date/time, **1 hour**, price, wallet balance.
- Pay with existing wallet debit (`CLASS_BOOKING`). If short, open wallet top-up and return to confirm.
- On success: snapshot `batch_size` from the rate card, create session if needed, insert enrollment, mark session `full` when at capacity, emit `CLASS_BOOKED`, go to student home.

## API

New student-only operations in `tutor-class-session` (resolver + service; wire module).

- `tutorBookableSlots(tutorId, offeringId, deliveryMode, from, to)` — calendar rows with `startsAt`, `tutorCalendarId`, `seatsLeft`, `batchSize`. Skip past and full slots.
- `bookTutorClass(tutorCalendarId, offeringId, deliveryMode)` — transaction: lock slot, re-check capacity, debit wallet, create session + enrollment.
- `studentBookedClassSessions(from, to)` — confirmed enrollments for the signed-in student.

## Calendar UI

New student screens on web and mobile. Week strip + 1-hour chips. Confirm step. Book class on tutor preview. Upcoming list on student home for the selected day.

## Out of scope

Cart, GST/invoicing Phase 4, demo mutation, ratings, map, tutor-side booking inbox, video join, cancellations.
