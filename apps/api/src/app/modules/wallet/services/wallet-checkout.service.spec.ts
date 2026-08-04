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
});
