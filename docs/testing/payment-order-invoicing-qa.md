# Payment order invoicing — QA guide

Manual and environment setup companion for Phase 1 (commerce orders) and Phase 2 (invoicing).

Related implementation plan: [`docs/plans/2026-06-15-unified-commerce-orders-invoicing.md`](../plans/2026-06-15-unified-commerce-orders-invoicing.md) (Jira TUTORIX-61).

Automated coverage: run `CI=true npx nx test api --testPathPatterns=commerce --watchman=false` (33 tests across invoice, checkout, resolver, admin, pricing, PDF util).

---

## Environment prerequisites

1. Commerce migration applied: `1777000000000-CreateCommerceOrders`
2. API running (`npm run serve:api`)
3. Platform fee configs present for `TUTOR_REGISTRATION`, `STUDENT_REGISTRATION`, `PROFICIENCY_TEST`
4. Payment gateway sandbox credentials for paid flows
5. Optional PDF tests: `S3_DOCUMENTS_BUCKET` + AWS credentials configured

---

## Fee config test matrix

Use **web-admin → Platform fees** or run the SQL below against your dev/staging database. Restore original values after QA.

### Scenario 1 — Waived registration (student E2E A / PT E2E D)

```sql
UPDATE platform_fee_config
SET amount_inr = 199,
    discount_type = 'NONE',
    discount_value = 0,
    waived = true,
    promo_message = 'QA: waived student registration'
WHERE code = 'STUDENT_REGISTRATION';
```

Expected: `payment_method = waived`, `amount_due_inr = 0`, invoice with list price + full discount.

### Scenario 2 — Full-price tutor registration (E2E B)

```sql
UPDATE platform_fee_config
SET amount_inr = 999,
    discount_type = 'NONE',
    discount_value = 0,
    waived = false,
    promo_message = NULL
WHERE code = 'TUTOR_REGISTRATION';
```

Expected: gateway checkout, `payment_method = gateway`, `amount_paid_inr = 999`.

### Scenario 3 — Discounted (non-waived) fee (E2E G)

```sql
UPDATE platform_fee_config
SET amount_inr = 500,
    discount_type = 'FIXED_INR',
    discount_value = 100,
    waived = false,
    promo_message = 'QA: ₹100 off registration'
WHERE code = 'TUTOR_REGISTRATION';
```

Expected: `amount_due_inr = 400`, `waiver_applied = false`, invoice net payable > 0.

### Scenario 4 — Waived PT fee (E2E D)

```sql
UPDATE platform_fee_config
SET amount_inr = 99,
    discount_type = 'NONE',
    discount_value = 0,
    waived = true,
    promo_message = 'QA: waived PT fee'
WHERE code = 'PROFICIENCY_TEST';
```

### Scenario 5 — Paid PT fee (E2E C)

```sql
UPDATE platform_fee_config
SET amount_inr = 99,
    discount_type = 'NONE',
    discount_value = 0,
    waived = false,
    promo_message = NULL
WHERE code = 'PROFICIENCY_TEST';
```

---

## Manual E2E checklists

### A. Student registration — waived

- [ ] Complete student onboarding payment step (web or mobile)
- [ ] `commerce_order`: `status = paid`, `payment_method = waived`, `amount_due_inr = 0`
- [ ] `commerce_order_item`: list price + full discount, `waiver_applied = true`
- [ ] No `commerce_payment_attempt` row
- [ ] `commerce_invoice` + `commerce_invoice_line` created
- [ ] Student onboarding advanced; re-initiate returns same order (no duplicate invoice)
- [ ] UI shows order number on success banner

### B. Tutor registration — paid via gateway

- [ ] Initiate and complete sandbox payment
- [ ] `commerce_order`: `status = paid`, `payment_method = gateway`
- [ ] `commerce_payment_attempt`: `status = paid`, gateway IDs set
- [ ] Invoice issued; tutor `regFeePaid = true`, stage past `registrationPayment`
- [ ] Razorpay receipt uses commerce order number

### C. PT fee — paid

- [ ] Same as B for PT item type; offering PT fee marked paid

### D. PT fee — waived

- [ ] Same as A for `PROFICIENCY_TEST` / `tutor_offering` reference

### E. Payment failure / cancellation

- [ ] Dismiss gateway or use failing test card
- [ ] Attempt `failed`; order not `paid`; **no invoice**; fulfillment unchanged

### F. Webhook fulfillment

- [ ] Complete payment via Razorpay webhook (not client confirm)
- [ ] Same end state as confirm; replay webhook → no duplicate invoice

### G. Discounted fee

- [ ] Apply scenario 3 config; verify partial discount on order line and PDF

---

## GraphQL API checks

### User — `myOrderInvoice`

```graphql
query MyOrderInvoice($orderId: Int!) {
  myOrderInvoice(orderId: $orderId) {
    id
    invoiceNumber
    orderNumber
    amountDueInr
    amountPaidInr
    paymentMethod
    issuedAt
    pdfUrl
  }
}
```

| Case | Expected |
|------|----------|
| Own paid order | Invoice summary; `pdfUrl` if S3 configured |
| Own pending order | `null` |
| Another user's order ID | `null` |
| No auth token | Auth error |

Automated: `commerce.resolver.spec.ts`

### Admin — `adminOrders` / `adminOrderDetail`

- Filter `paymentMethod: waived`, `status: paid`, `zeroAmountOnly: true`
- Detail includes `invoice { invoiceNumber pdfUrl ... }`

Automated: `commerce-admin.service.spec.ts`

---

## Admin UI checks ([`web-admin`](../../apps/web-admin))

### Orders list (`/orders`)

- [ ] Pagination works
- [ ] Status filter `Paid`
- [ ] Payment method filter `Waived`
- [ ] Zero amount only checkbox
- [ ] Search by order number / payer email
- [ ] Row links to detail page

### Order detail (`/orders/:orderId`)

- [ ] Totals match database
- [ ] Line items: rate, discount, waiver, fulfillment
- [ ] Invoice section: number, issued date, net payable
- [ ] Download PDF link when S3 configured; fallback message when not
- [ ] Payment attempts: populated for gateway; waived message for ₹0

---

## PDF content verification

When S3 is configured, download PDF and verify:

- [ ] Invoice number, order number, issued date, payment mode label
- [ ] Billing name/email; address from primary student/tutor address when present
- [ ] Line table without GST column (pre-registration)
- [ ] Totals: subtotal, discount, net payable, amount paid
- [ ] Waived: list price visible, net ₹0
- [ ] Storage key: `invoices/{userId}/{invoiceNumber}.pdf`

---

## Data integrity SQL

Replace `:order_id` with a paid order id after each flow:

```sql
SELECT
  o.id AS order_id,
  o.order_number,
  o.status,
  o.payment_method,
  i.id AS invoice_id,
  i.invoice_number,
  o.subtotal_inr = i.subtotal_inr AS subtotal_match,
  o.discount_inr = i.discount_inr AS discount_match,
  o.amount_due_inr = i.amount_due_inr AS amount_due_match,
  o.amount_paid_inr = i.amount_paid_inr AS amount_paid_match,
  (SELECT COUNT(*) FROM commerce_order_item oi WHERE oi.order_id = o.id AND oi.deleted = false) AS order_items,
  (SELECT COUNT(*) FROM commerce_invoice_line il WHERE il.invoice_id = i.id AND il.deleted = false) AS invoice_lines
FROM commerce_order o
LEFT JOIN commerce_invoice i ON i.order_id = o.id AND i.deleted = false
WHERE o.id = :order_id;
```

Pending/failed orders should have `invoice_id IS NULL`.

---

## Known gaps (expected limitations — not QA failures)

1. **End-user invoice download not wired** — web/mobile onboarding shows order number only; `MY_ORDER_INVOICE` query exists but is unused in client UI. Admin can download PDF today.
2. **No `myInvoices` list query** — only per-order `myOrderInvoice`.
3. **GST deferred** — all tax fields stored as 0; PDF omits GST via `SHOW_GST_ON_INVOICE = false`.
4. **Points and cart checkout** — not implemented (Phase 3/4).
5. **Student/tutor "My orders" profile screen** — not built.

---

## QA sign-off criteria

Phase 2 invoicing is ready when:

1. Every paid order (waived, gateway, ₹0 net) has exactly one invoice + matching lines
2. No invoice for pending, failed, or cancelled orders
3. Admin can filter waived orders and download PDFs (when S3 configured)
4. PDF matches order data for waived student reg, paid tutor reg, and paid PT
5. Webhook and confirm paths produce identical outcomes
6. All commerce unit tests pass (`33` tests as of 2026-06-22)
