import {
  formatWalletLowBalanceMessage,
  runWalletAwarePurchaseCheckout,
  validateStandaloneWalletTopUpAmount,
  WALLET_STANDALONE_TOP_UP_MAX_INR,
  WALLET_STANDALONE_TOP_UP_MIN_INR,
} from './wallet-checkout';

describe('wallet-checkout utils', () => {
  it('formats zero-balance message', () => {
    expect(formatWalletLowBalanceMessage(0, 100)).toBe(
      'Your wallet balance is ₹0. Please add at least ₹100 in order to complete this transaction.',
    );
  });

  it('formats partial-balance message', () => {
    expect(formatWalletLowBalanceMessage(30, 70)).toBe(
      'Your wallet balance is ₹30. Please add at least ₹70 in order to complete this transaction.',
    );
  });

  it('completes purchase from wallet without gateway', async () => {
    const result = await runWalletAwarePurchaseCheckout(
      {
        itemType: 'PROFICIENCY_TEST',
        referenceType: 'tutor_offering',
        referenceId: 1,
      },
      async () => ({
        purchaseAmountInr: 100,
        walletBalanceInr: 150,
        shortfallInr: 0,
        canPayFromWallet: true,
        purchaseDescription: 'PT',
      }),
      async () => ({ wallet: { balanceInr: 50 } }),
      async () => {
        throw new Error('should not top up');
      },
      async () => {
        throw new Error('should not confirm top up');
      },
      async () => 100,
    );

    expect(result).toEqual({ walletBalanceInr: 50, usedGateway: false });
  });

  it('validates standalone top-up amount bounds', () => {
    expect(() =>
      validateStandaloneWalletTopUpAmount(WALLET_STANDALONE_TOP_UP_MIN_INR - 1),
    ).toThrow(/at least ₹500/);
    expect(() =>
      validateStandaloneWalletTopUpAmount(WALLET_STANDALONE_TOP_UP_MAX_INR + 1),
    ).toThrow(/cannot exceed/);
    expect(() => validateStandaloneWalletTopUpAmount(2000)).not.toThrow();
  });
});
