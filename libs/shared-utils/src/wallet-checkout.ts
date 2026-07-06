import {
  openPaymentCheckout,
  checkoutSession,
  type CheckoutResult,
  type ConfirmPaymentInput,
  type PaymentOrderSession,
} from './payment-checkout';

export type WalletPurchaseIntent = {
  itemType: 'PROFICIENCY_TEST' | 'CLASS_BOOKING';
  referenceType: 'tutor_offering' | 'class_session';
  referenceId: number;
};

export type WalletPurchasePreview = {
  purchaseAmountInr: number;
  walletBalanceInr: number;
  shortfallInr: number;
  canPayFromWallet: boolean;
  purchaseDescription: string;
};

export type WalletTopUpInputPayload = {
  amountInr: number;
  purchaseIntent?: WalletPurchaseIntent;
};

export type WalletTopUpResult = {
  wallet: { balanceInr: number };
  purchaseOrderId?: number | null;
  purchaseOrderNumber?: string | null;
};

export function formatWalletLowBalanceMessage(
  walletBalanceInr: number,
  shortfallInr: number,
): string {
  if (walletBalanceInr <= 0) {
    return `Your wallet balance is ₹0. Please add at least ₹${shortfallInr} in order to complete this transaction.`;
  }
  return `Your wallet balance is ₹${walletBalanceInr}. Please add at least ₹${shortfallInr} in order to complete this transaction.`;
}

export async function runWalletAwarePurchaseCheckout(
  purchaseIntent: WalletPurchaseIntent,
  prepareWalletPurchase: (
    intent: WalletPurchaseIntent,
  ) => Promise<WalletPurchasePreview>,
  completeWalletPurchase: (
    intent: WalletPurchaseIntent,
  ) => Promise<{ wallet: { balanceInr: number } }>,
  initiateWalletTopUp: (
    input: WalletTopUpInputPayload,
  ) => Promise<CheckoutResult | null | undefined>,
  confirmWalletTopUp: (
    input: ConfirmPaymentInput & { purchaseIntent?: WalletPurchaseIntent },
  ) => Promise<WalletTopUpResult>,
  resolveTopUpAmount: (preview: WalletPurchasePreview) => Promise<number>,
  openCheckout: (
    session: PaymentOrderSession,
  ) => Promise<ConfirmPaymentInput> = openPaymentCheckout,
): Promise<{ walletBalanceInr: number; usedGateway: boolean }> {
  const preview = await prepareWalletPurchase(purchaseIntent);

  if (preview.canPayFromWallet) {
    const result = await completeWalletPurchase(purchaseIntent);
    return { walletBalanceInr: result.wallet.balanceInr, usedGateway: false };
  }

  const topUpAmount = await resolveTopUpAmount(preview);
  if (topUpAmount < preview.shortfallInr) {
    throw new Error(
      `Top-up amount must be at least ₹${preview.shortfallInr}`,
    );
  }

  const checkout = await initiateWalletTopUp({
    amountInr: topUpAmount,
    purchaseIntent,
  });
  if (!checkout) {
    throw new Error('Could not initiate wallet top-up');
  }

  const session = checkoutSession(checkout);
  if (session.skipped) {
    throw new Error('Wallet top-up cannot be skipped');
  }

  const confirmation = await openCheckout(session);
  const result = await confirmWalletTopUp({
    ...confirmation,
    purchaseIntent,
  });

  return {
    walletBalanceInr: result.wallet.balanceInr,
    usedGateway: true,
  };
}
