type BankDetailsLike = {
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  gstNumber?: string | null;
};

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
  return Boolean(
    details.bankName?.trim() &&
      details.accountNumber?.trim() &&
      details.ifscCode?.trim(),
  );
}

export function formatGstDisplay(gstNumber?: string | null): string | null {
  const trimmed = gstNumber?.trim();
  if (!trimmed || trimmed.toUpperCase() === 'N/A') {
    return null;
  }
  return trimmed;
}
