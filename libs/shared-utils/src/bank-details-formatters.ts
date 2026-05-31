type BankDetailsLike = {
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
};

/** Indian PAN: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F). */
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function normalizePanNumber(panNumber: string): string {
  return panNumber.trim().toUpperCase();
}

export function maskAccountNumber(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, '');
  if (digits.length <= 4) {
    return digits;
  }
  const lastFour = digits.slice(-4);
  const maskedLength = Math.max(digits.length - 4, 6);
  return `${'x'.repeat(maskedLength)}${lastFour}`;
}

export function isBankDetailsComplete(details: BankDetailsLike | null | undefined): boolean {
  if (!details) {
    return false;
  }
  const pan = details.panNumber?.trim();
  return Boolean(
    details.bankName?.trim() &&
      details.accountNumber?.trim() &&
      details.ifscCode?.trim() &&
      pan &&
      PAN_PATTERN.test(pan.toUpperCase()),
  );
}

export function formatGstDisplay(gstNumber?: string | null): string | null {
  const trimmed = gstNumber?.trim();
  if (!trimmed || trimmed.toUpperCase() === 'N/A') {
    return null;
  }
  return trimmed;
}

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const GST_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export type BankDetailsFormInput = {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  panNumber: string;
  gstNumber: string;
};

export function validateBankDetailsForm(
  values: BankDetailsFormInput,
): { ok: true; normalized: BankDetailsFormInput } | { ok: false; message: string } {
  const bankName = values.bankName.trim();
  if (!bankName) {
    return { ok: false, message: 'Please select or enter a bank name.' };
  }

  const accountNumber = values.accountNumber.trim();
  if (!/^\d{9,18}$/.test(accountNumber)) {
    return { ok: false, message: 'Account number must be 9 to 18 digits.' };
  }

  const ifscCode = values.ifscCode.trim().toUpperCase();
  if (!IFSC_PATTERN.test(ifscCode)) {
    return { ok: false, message: 'Please enter a valid IFSC code (e.g. HDFC0001234).' };
  }

  const panNumber = normalizePanNumber(values.panNumber);
  if (!PAN_PATTERN.test(panNumber)) {
    return { ok: false, message: 'Please enter a valid PAN (e.g. ABCDE1234F).' };
  }

  const gst = values.gstNumber.trim();
  if (gst && !GST_PATTERN.test(gst.toUpperCase())) {
    return { ok: false, message: 'Please enter a valid GST number or leave it blank.' };
  }

  return {
    ok: true,
    normalized: {
      bankName,
      accountNumber,
      ifscCode,
      panNumber,
      gstNumber: gst,
    },
  };
}
