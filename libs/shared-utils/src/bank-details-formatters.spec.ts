import {
  isBankDetailsComplete,
  normalizePanNumber,
  PAN_PATTERN,
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
});
