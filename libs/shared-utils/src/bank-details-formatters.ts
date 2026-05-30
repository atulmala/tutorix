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
