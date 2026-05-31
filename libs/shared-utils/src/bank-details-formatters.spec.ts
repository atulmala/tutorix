import {
  isBankDetailsComplete,
  normalizePanNumber,
  PAN_PATTERN,
  validateBankDetailsForm,
} from './bank-details-formatters';

describe('bank-details-formatters', () => {
  describe('normalizePanNumber', () => {
    it('uppercases and trims PAN', () => {
      expect(normalizePanNumber('  abcde1234f ')).toBe('ABCDE1234F');
    });
  });

  describe('isBankDetailsComplete', () => {
    const complete = {
      bankName: 'HDFC Bank',
      accountNumber: '123456789',
      ifscCode: 'HDFC0001234',
      panNumber: 'ABCDE1234F',
    };

    it('returns true when all required fields including PAN are present', () => {
      expect(isBankDetailsComplete(complete)).toBe(true);
    });

    it('returns false when PAN is missing', () => {
      expect(isBankDetailsComplete({ ...complete, panNumber: null })).toBe(false);
    });

    it('returns false when PAN format is invalid', () => {
      expect(isBankDetailsComplete({ ...complete, panNumber: 'INVALID' })).toBe(false);
    });
  });

  describe('PAN_PATTERN', () => {
    it('matches valid Indian PAN', () => {
      expect(PAN_PATTERN.test('ABCDE1234F')).toBe(true);
    });
  });

  describe('validateBankDetailsForm', () => {
    it('returns normalized values when valid', () => {
      const result = validateBankDetailsForm({
        bankName: 'HDFC Bank',
        accountNumber: '123456789012',
        ifscCode: 'hdfc0001234',
        panNumber: 'abcde1234f',
        gstNumber: '',
      });
      expect(result).toEqual({
        ok: true,
        normalized: {
          bankName: 'HDFC Bank',
          accountNumber: '123456789012',
          ifscCode: 'HDFC0001234',
          panNumber: 'ABCDE1234F',
          gstNumber: '',
        },
      });
    });

    it('returns error when PAN is invalid', () => {
      const result = validateBankDetailsForm({
        bankName: 'SBI',
        accountNumber: '123456789',
        ifscCode: 'SBIN0001234',
        panNumber: 'BAD',
        gstNumber: '',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('PAN');
      }
    });
  });
});
