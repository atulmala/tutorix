import { BadRequestException } from '@nestjs/common';
import { WalletCheckoutService } from './wallet-checkout.service';
import {
  WalletPurchaseItemTypeEnum,
  WalletPurchaseReferenceTypeEnum,
} from '../enums/wallet.enums';

describe('WalletCheckoutService', () => {
  let service: WalletCheckoutService;
  let walletService: {
    getWalletForUser: jest.Mock;
    assertUserOnboarded: jest.Mock;
    toWalletDto: jest.Mock;
  };

  beforeEach(() => {
    walletService = {
      getWalletForUser: jest.fn(),
      assertUserOnboarded: jest.fn(),
      toWalletDto: jest.fn((wallet) => ({ balanceInr: wallet.balanceInr })),
    };

    service = new WalletCheckoutService(
      walletService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('computes shortfall for wallet purchase preview', async () => {
    walletService.getWalletForUser.mockResolvedValue({ balanceInr: 30 });

    jest
      .spyOn(
        service as unknown as {
          resolvePurchase: WalletCheckoutService['resolvePurchase'];
        },
        'resolvePurchase',
      )
      .mockResolvedValue({
        itemType: 'PROFICIENCY_TEST',
        referenceType: 'tutor_offering',
        referenceId: 12,
        amountInr: 100,
        description: 'Proficiency test',
        payerRole: 'tutor',
        feeCode: 'PROFICIENCY_TEST',
        feeContextType: 'tutor_offering',
        feeContextId: 12,
      } as never);

    const preview = await service.prepareWalletPurchase({ id: 1 } as never, {
      itemType: WalletPurchaseItemTypeEnum.PROFICIENCY_TEST,
      referenceType: WalletPurchaseReferenceTypeEnum.tutor_offering,
      referenceId: 12,
    });

    expect(preview).toEqual({
      purchaseAmountInr: 100,
      walletBalanceInr: 30,
      shortfallInr: 70,
      canPayFromWallet: false,
      purchaseDescription: 'Proficiency test',
    });
  });

  it('rejects top-up below shortfall when purchase intent is present', async () => {
    jest.spyOn(service, 'prepareWalletPurchase').mockResolvedValue({
      purchaseAmountInr: 100,
      walletBalanceInr: 0,
      shortfallInr: 100,
      canPayFromWallet: false,
      purchaseDescription: 'Proficiency test',
    });

    await expect(
      service.initiateWalletTopUp(
        { id: 1 } as never,
        {
          amountInr: 50,
          purchaseIntent: {
            itemType: WalletPurchaseItemTypeEnum.PROFICIENCY_TEST,
            referenceType: WalletPurchaseReferenceTypeEnum.tutor_offering,
            referenceId: 12,
          },
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('labels a class-booking shortfall as a class booking on the gateway', async () => {
    const createOrder = jest.fn().mockResolvedValue({
      provider: 'razorpay',
      orderId: 'order_1',
      amountInr: 800,
      currency: 'INR',
      checkoutPayload: { key: 'k' },
    });
    const checkout = new WalletCheckoutService(
      walletService as never,
      {
        createOrderWithItems: jest.fn().mockResolvedValue({
          id: 9,
          orderNumber: 'TX1',
        }),
        markOrderPendingPayment: jest.fn(),
        toDto: jest.fn().mockReturnValue({ id: 9 }),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { getActiveGateway: () => ({ createOrder }) } as never,
      { findByUserId: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { create: jest.fn((row) => row), save: jest.fn() } as never,
      {} as never,
      {} as never,
    );
    jest.spyOn(checkout, 'prepareWalletPurchase').mockResolvedValue({
      purchaseAmountInr: 1000,
      walletBalanceInr: 200,
      shortfallInr: 800,
      canPayFromWallet: false,
      purchaseDescription: 'Class booking · 1 pack',
    });
    jest
      .spyOn(
        checkout as unknown as {
          resolvePurchase: WalletCheckoutService['resolvePurchase'];
        },
        'resolvePurchase',
      )
      .mockResolvedValue({
        itemType: 'CLASS_BOOKING',
        description: 'Class booking · 1 pack',
      } as never);

    await checkout.initiateWalletTopUp(
      { id: 1, email: 'student@example.com' } as never,
      {
        amountInr: 800,
        purchaseIntent: {
          itemType: WalletPurchaseItemTypeEnum.CLASS_BOOKING,
          referenceType: WalletPurchaseReferenceTypeEnum.cart,
          referenceId: 5,
        },
      },
    );

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: expect.objectContaining({
          feeCode: 'CLASS_BOOKING',
          description: 'Class booking · 1 pack',
        }),
      }),
    );
    expect(createOrder.mock.calls[0][0].notes.description).not.toBe('Wallet top-up');
  });

  it('labels a standalone top-up as a wallet top-up', async () => {
    const createOrder = jest.fn().mockResolvedValue({
      provider: 'razorpay',
      orderId: 'order_2',
      amountInr: 500,
      currency: 'INR',
      checkoutPayload: { key: 'k' },
    });
    const checkout = new WalletCheckoutService(
      walletService as never,
      {
        createOrderWithItems: jest.fn().mockResolvedValue({
          id: 10,
          orderNumber: 'TX2',
        }),
        markOrderPendingPayment: jest.fn(),
        toDto: jest.fn().mockReturnValue({ id: 10 }),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { getActiveGateway: () => ({ createOrder }) } as never,
      { findByUserId: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { create: jest.fn((row) => row), save: jest.fn() } as never,
      {} as never,
      {} as never,
    );

    await checkout.initiateWalletTopUp(
      { id: 1, email: 'student@example.com' } as never,
      { amountInr: 500 },
    );

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: expect.objectContaining({
          description: 'Wallet top-up',
        }),
      }),
    );
    expect(createOrder.mock.calls[0][0].notes.feeCode).toBeUndefined();
  });

  it('rejects standalone top-up below minimum', async () => {
    await expect(
      service.initiateWalletTopUp({ id: 1 } as never, { amountInr: 499 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects top-up above maximum', async () => {
    await expect(
      service.initiateWalletTopUp({ id: 1 } as never, { amountInr: 10_001 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('completes a class cart purchase through the cart service', async () => {
    const completePaidCart = jest.fn().mockResolvedValue({
      wallet: { balanceInr: 40 },
      orderId: 40,
      orderNumber: 'ORD-1',
    });
    const requirePricedCart = jest.fn().mockResolvedValue({ cart: { id: 5 } });
    const cartService = new WalletCheckoutService(
      walletService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { completePaidCart, requirePricedCart } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await cartService.completeWalletPurchase({ id: 1 } as never, {
      itemType: WalletPurchaseItemTypeEnum.CLASS_BOOKING,
      referenceType: WalletPurchaseReferenceTypeEnum.cart,
      referenceId: 5,
    });

    expect(completePaidCart).toHaveBeenCalledTimes(1);
    expect(result.orderId).toBe(40);
  });
});
