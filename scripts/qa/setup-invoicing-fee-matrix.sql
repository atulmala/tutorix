-- QA fee matrix setup for payment order invoicing tests
-- Run against dev/staging only. Adjust amounts as needed for your environment.
-- See docs/testing/payment-order-invoicing-qa.md for scenario descriptions.

-- Scenario 1: Waived student registration (E2E A)
UPDATE platform_fee_config
SET amount_inr = 199,
    discount_type = 'NONE',
    discount_value = 0,
    waived = true,
    promo_message = 'QA: waived student registration'
WHERE code = 'STUDENT_REGISTRATION';

-- Scenario 2: Full-price tutor registration (E2E B)
-- Uncomment to apply:
-- UPDATE platform_fee_config
-- SET amount_inr = 999,
--     discount_type = 'NONE',
--     discount_value = 0,
--     waived = false,
--     promo_message = NULL
-- WHERE code = 'TUTOR_REGISTRATION';

-- Scenario 3: Discounted tutor registration (E2E G)
-- Uncomment to apply:
-- UPDATE platform_fee_config
-- SET amount_inr = 500,
--     discount_type = 'FIXED_INR',
--     discount_value = 100,
--     waived = false,
--     promo_message = 'QA: ₹100 off registration'
-- WHERE code = 'TUTOR_REGISTRATION';

-- Scenario 4: Waived PT fee (E2E D)
-- UPDATE platform_fee_config
-- SET amount_inr = 99,
--     discount_type = 'NONE',
--     discount_value = 0,
--     waived = true,
--     promo_message = 'QA: waived PT fee'
-- WHERE code = 'PROFICIENCY_TEST';

-- Scenario 5: Paid PT fee (E2E C)
-- UPDATE platform_fee_config
-- SET amount_inr = 99,
--     discount_type = 'NONE',
--     discount_value = 0,
--     waived = false,
--     promo_message = NULL
-- WHERE code = 'PROFICIENCY_TEST';
