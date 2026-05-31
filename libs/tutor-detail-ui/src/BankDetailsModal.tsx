import React, { useEffect, useMemo, useState } from 'react';
import { INDIAN_BANKS, OTHER_BANK_OPTION, validateBankDetailsForm } from '@tutorix/shared-utils';

export type BankDetailsFormValues = {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  panNumber: string;
  gstNumber: string;
};

type BankDetailsModalProps = {
  open: boolean;
  initialValues?: {
    bankName?: string | null;
    ifscCode?: string | null;
    panNumber?: string | null;
    gstNumber?: string | null;
  } | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: BankDetailsFormValues) => void;
};

const EMPTY_FORM: BankDetailsFormValues = {
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  panNumber: '',
  gstNumber: '',
};

function resolveBankSelectValue(bankName?: string | null): string {
  if (!bankName) {
    return '';
  }
  if ((INDIAN_BANKS as readonly string[]).includes(bankName)) {
    return bankName;
  }
  return OTHER_BANK_OPTION;
}

export function BankDetailsModal({
  open,
  initialValues,
  saving = false,
  error,
  onClose,
  onSubmit,
}: BankDetailsModalProps) {
  const [bankSelect, setBankSelect] = useState('');
  const [customBankName, setCustomBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const selectValue = resolveBankSelectValue(initialValues?.bankName);
    setBankSelect(selectValue);
    setCustomBankName(
      selectValue === OTHER_BANK_OPTION ? initialValues?.bankName?.trim() ?? '' : '',
    );
    setAccountNumber('');
    setIfscCode(initialValues?.ifscCode?.trim().toUpperCase() ?? '');
    setPanNumber(initialValues?.panNumber?.trim().toUpperCase() ?? '');
    setGstNumber(initialValues?.gstNumber?.trim() ?? '');
    setValidationError(null);
  }, [open, initialValues]);

  const resolvedBankName = useMemo(() => {
    if (bankSelect === OTHER_BANK_OPTION) {
      return customBankName.trim();
    }
    return bankSelect.trim();
  }, [bankSelect, customBankName]);

  if (!open) {
    return null;
  }

  const handleSubmit = () => {
    const result = validateBankDetailsForm({
      bankName: resolvedBankName,
      accountNumber,
      ifscCode,
      panNumber,
      gstNumber,
    });
    if (result.ok === false) {
      setValidationError(result.message);
      return;
    }
    setValidationError(null);
    onSubmit(result.normalized);
  };

  const displayError = validationError ?? error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-details-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 id="bank-details-title" className="text-xl font-semibold text-primary">
            Bank details
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition hover:text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-1 text-left">
            <label htmlFor="bank-select" className="text-sm font-medium text-primary">
              Bank name
            </label>
            <select
              id="bank-select"
              value={bankSelect}
              onChange={(e) => setBankSelect(e.target.value)}
              className="w-full rounded-md border border-subtle bg-white px-md py-sm text-primary shadow-sm focus:border-primary focus:outline-none"
            >
              <option value="">Select a bank</option>
              {INDIAN_BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
              <option value={OTHER_BANK_OPTION}>{OTHER_BANK_OPTION}</option>
            </select>
          </div>

          {bankSelect === OTHER_BANK_OPTION ? (
            <div className="space-y-1 text-left">
              <label htmlFor="custom-bank-name" className="text-sm font-medium text-primary">
                Enter bank name
              </label>
              <input
                id="custom-bank-name"
                type="text"
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
                className="w-full rounded-md border border-subtle bg-white px-md py-sm text-primary shadow-sm focus:border-primary focus:outline-none"
                placeholder="Your bank name"
              />
            </div>
          ) : null}

          <div className="space-y-1 text-left">
            <label htmlFor="account-number" className="text-sm font-medium text-primary">
              Account number
            </label>
            <input
              id="account-number"
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-md border border-subtle bg-white px-md py-sm text-primary shadow-sm focus:border-primary focus:outline-none"
              placeholder={initialValues?.bankName ? 'Re-enter to update' : 'Enter account number'}
            />
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="ifsc-code" className="text-sm font-medium text-primary">
              IFSC code
            </label>
            <input
              id="ifsc-code"
              type="text"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              className="w-full rounded-md border border-subtle bg-white px-md py-sm uppercase text-primary shadow-sm focus:border-primary focus:outline-none"
              placeholder="HDFC0001234"
              maxLength={11}
            />
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="pan-number" className="text-sm font-medium text-primary">
              PAN
            </label>
            <input
              id="pan-number"
              type="text"
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
              className="w-full rounded-md border border-subtle bg-white px-md py-sm uppercase text-primary shadow-sm focus:border-primary focus:outline-none"
              placeholder="ABCDE1234F"
              maxLength={10}
            />
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="gst-number" className="text-sm font-medium text-primary">
              GST number <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="gst-number"
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              className="w-full rounded-md border border-subtle bg-white px-md py-sm uppercase text-primary shadow-sm focus:border-primary focus:outline-none"
              placeholder="Leave blank if not applicable"
              maxLength={15}
            />
          </div>

          {displayError ? (
            <p className="text-sm text-red-600" role="alert">
              {displayError}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-subtle px-4 py-2 text-sm font-medium text-primary transition hover:bg-subtle"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !bankSelect}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { EMPTY_FORM as EMPTY_BANK_DETAILS_FORM };
