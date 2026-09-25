import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { WalletService } from '../../wallet/services/wallet.service';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import {
  CartCheckoutPreviewDto,
  ScheduleClassCreditResult,
  StudentCartDto,
  StudentClassCreditDto,
} from '../dto/student-cart.dto';
import { StudentCartService } from '../services/student-cart.service';
import { StudentClassCreditService } from '../services/student-class-credit.service';

@Resolver()
export class StudentCartResolver {
  constructor(
    private readonly cartService: StudentCartService,
    private readonly creditService: StudentClassCreditService,
    private readonly walletService: WalletService,
  ) {}

  @Query(() => StudentCartDto, { name: 'myCart' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  myCart(@CurrentUser() user: User): Promise<StudentCartDto> {
    return this.cartService.myCart(user);
  }

  @Query(() => CartCheckoutPreviewDto, { name: 'prepareCartCheckout' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async prepareCartCheckout(@CurrentUser() user: User): Promise<CartCheckoutPreviewDto> {
    const priced = await this.cartService.requirePricedCart(user);
    const wallet = await this.walletService.getWalletForUser(user.id);
    return {
      cartId: priced.cart.id,
      purchaseAmountInr: priced.totalInr,
      walletBalanceInr: wallet.balanceInr,
      shortfallInr: Math.max(0, priced.totalInr - wallet.balanceInr),
      canPayFromWallet: wallet.balanceInr >= priced.totalInr,
      items: priced.dtos,
    };
  }

  @Query(() => [StudentClassCreditDto], { name: 'myClassCredits' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  myClassCredits(@CurrentUser() user: User): Promise<StudentClassCreditDto[]> {
    return this.creditService.listCredits(user);
  }

  @Mutation(() => StudentCartDto, { name: 'addToCart' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  addToCart(
    @CurrentUser() user: User,
    @Args('tutorId', { type: () => ID }) tutorId: number,
    @Args('offeringId', { type: () => ID }) offeringId: number,
    @Args('deliveryMode', { type: () => ClassSessionDeliveryModeEnum })
    deliveryMode: ClassSessionDeliveryModeEnum,
    @Args('quantity', { type: () => Int }) quantity: number,
  ): Promise<StudentCartDto> {
    return this.cartService.addToCart(user, tutorId, offeringId, deliveryMode, quantity);
  }

  @Mutation(() => StudentCartDto, { name: 'updateCartItem' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  updateCartItem(
    @CurrentUser() user: User,
    @Args('itemId', { type: () => ID }) itemId: number,
    @Args('quantity', { type: () => Int }) quantity: number,
  ): Promise<StudentCartDto> {
    return this.cartService.updateCartItem(user, itemId, quantity);
  }

  @Mutation(() => StudentCartDto, { name: 'removeFromCart' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  removeFromCart(
    @CurrentUser() user: User,
    @Args('itemId', { type: () => ID }) itemId: number,
  ): Promise<StudentCartDto> {
    return this.cartService.removeFromCart(user, itemId);
  }

  @Mutation(() => ScheduleClassCreditResult, { name: 'scheduleClassCredit' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  scheduleClassCredit(
    @CurrentUser() user: User,
    @Args('creditId', { type: () => ID }) creditId: number,
    @Args('tutorCalendarId', { type: () => ID }) tutorCalendarId: number,
  ): Promise<ScheduleClassCreditResult> {
    return this.creditService.schedule(user, creditId, tutorCalendarId);
  }

  @Mutation(() => ScheduleClassCreditResult, { name: 'rescheduleClassCredit' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  rescheduleClassCredit(
    @CurrentUser() user: User,
    @Args('creditId', { type: () => ID }) creditId: number,
    @Args('tutorCalendarId', { type: () => ID }) tutorCalendarId: number,
  ): Promise<ScheduleClassCreditResult> {
    return this.creditService.reschedule(user, creditId, tutorCalendarId);
  }
}
