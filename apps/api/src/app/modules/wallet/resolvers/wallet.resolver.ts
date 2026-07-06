import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { CheckoutResultDto } from '../../commerce/dto/checkout-result.dto';
import {
  UserWalletDto,
  WalletTransactionConnectionDto,
} from '../dto/wallet.dto';
import {
  ConfirmWalletTopUpInput,
  WalletPurchaseIntentInput,
  WalletPurchasePreviewInput,
  WalletTopUpInput,
} from '../dto/wallet.input';
import {
  WalletPurchasePreviewDto,
  WalletPurchaseResultDto,
  WalletTopUpResultDto,
} from '../dto/wallet-checkout.dto';
import { WalletCheckoutService } from '../services/wallet-checkout.service';
import { WalletService } from '../services/wallet.service';

@Resolver()
export class WalletResolver {
  constructor(
    private readonly walletService: WalletService,
    private readonly walletCheckoutService: WalletCheckoutService,
  ) {}

  @Query(() => UserWalletDto, {
    description: 'Current user wallet balance (onboarded users only)',
  })
  @UseGuards(JwtAuthGuard)
  async myWallet(@CurrentUser() user: User): Promise<UserWalletDto> {
    const wallet = await this.walletService.getWalletForUser(user.id);
    return this.walletService.toWalletDto(wallet);
  }

  @Query(() => WalletTransactionConnectionDto, {
    description: 'Paginated wallet transaction history',
  })
  @UseGuards(JwtAuthGuard)
  async myWalletTransactions(
    @CurrentUser() user: User,
    @Args('first', { type: () => Int, nullable: true, defaultValue: 20 })
    first?: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset?: number,
  ): Promise<WalletTransactionConnectionDto> {
    return this.walletService.listTransactions(user.id, first, offset);
  }

  @Query(() => WalletPurchasePreviewDto, {
    description: 'Preview a wallet purchase including balance and shortfall',
  })
  @UseGuards(JwtAuthGuard)
  async prepareWalletPurchase(
    @CurrentUser() user: User,
    @Args('input') input: WalletPurchasePreviewInput,
  ): Promise<WalletPurchasePreviewDto> {
    return this.walletCheckoutService.prepareWalletPurchase(
      user,
      input.purchaseIntent,
    );
  }

  @Mutation(() => WalletPurchaseResultDto, {
    description: 'Pay for a purchase using wallet balance only',
  })
  @UseGuards(JwtAuthGuard)
  async completeWalletPurchase(
    @CurrentUser() user: User,
    @Args('purchaseIntent') purchaseIntent: WalletPurchaseIntentInput,
  ): Promise<WalletPurchaseResultDto> {
    return this.walletCheckoutService.completeWalletPurchase(user, purchaseIntent);
  }

  @Mutation(() => CheckoutResultDto, {
    description: 'Initiate wallet top-up via payment gateway',
  })
  @UseGuards(JwtAuthGuard)
  async initiateWalletTopUp(
    @CurrentUser() user: User,
    @Args('input') input: WalletTopUpInput,
  ): Promise<CheckoutResultDto> {
    return this.walletCheckoutService.initiateWalletTopUp(user, input);
  }

  @Mutation(() => WalletTopUpResultDto, {
    description: 'Confirm wallet top-up and optionally complete a pending purchase',
  })
  @UseGuards(JwtAuthGuard)
  async confirmWalletTopUp(
    @CurrentUser() user: User,
    @Args('input') input: ConfirmWalletTopUpInput,
  ): Promise<WalletTopUpResultDto> {
    return this.walletCheckoutService.confirmWalletTopUp(user, input);
  }
}
