---
title: Admin detail wallet header
status: in-progress
jira: TUTORIX-62
created: 2026-07-10
---

# Admin detail wallet header

## Goal

On admin student and tutor detail pages, show a wallet icon + balance in the header (same chip as student/tutor home). Clicking it opens the same transaction history UI (balance + list).

## Approach

### Backend

- Add admin-only GraphQL queries that resolve `studentId` / `tutorId` → `userId`, then reuse `WalletService`:
  - `adminStudentWallet(studentId)` / `adminTutorWallet(tutorId)` → `UserWalletDto` (nullable)
  - `adminStudentWalletTransactions` / `adminTutorWalletTransactions` → same connection shape as `myWalletTransactions`
- Import `WalletModule` into `AdminModule`
- Soft-fail when wallet missing or onboarding incomplete (return null / empty list) so the chip can hide

### Frontend (`web-admin`)

- Add admin GraphQL documents in `shared-graphql`
- Add `AdminWalletBalanceChip` + `AdminWalletTransactionsModal` mirroring `WalletBalanceChip` / `WalletPage`
- Pass chip via existing `headerTrailing` on `StudentDetailPage` / `TutorDetailPage`; open modal on click

## Out of scope

- Extracting a shared `wallet-ui` lib (can follow later)
- Admin wallet top-up / debit actions
