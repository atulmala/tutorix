import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { PlatformFeePaymentService } from '../services/platform-fee-payment.service';
import { ConfirmPlatformFeePaymentInput } from '../dto/confirm-platform-fee-payment.input';
import { CheckoutResultDto } from '../../commerce/dto/checkout-result.dto';

@Resolver()
export class PaymentResolver {
  constructor(
    private readonly platformFeePaymentService: PlatformFeePaymentService,
  ) {}

  @Mutation(() => CheckoutResultDto, {
    description: 'Initiate platform fee payment for onboarding fees',
  })
  @UseGuards(JwtAuthGuard)
  async initiatePlatformFeePayment(
    @CurrentUser() user: User,
    @Args('feeCode', { type: () => PlatformFeeCodeEnum }) feeCode: PlatformFeeCodeEnum,
  ): Promise<CheckoutResultDto> {
    return this.platformFeePaymentService.initiatePlatformFeePayment(
      feeCode,
      user,
    );
  }

  @Mutation(() => CheckoutResultDto, {
    description: 'Confirm platform fee payment after gateway checkout',
  })
  @UseGuards(JwtAuthGuard)
  async confirmPlatformFeePayment(
    @CurrentUser() user: User,
    @Args('input') input: ConfirmPlatformFeePaymentInput,
  ): Promise<CheckoutResultDto> {
    return this.platformFeePaymentService.confirmPlatformFeePayment(
      input,
      user,
    );
  }
}
