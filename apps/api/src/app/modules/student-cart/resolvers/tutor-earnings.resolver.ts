import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  MyTutorEarningsSummary,
  MyTutorMonthlyEarnings,
  MyTutorPayoutPeriodDetail,
  TutorPayoutTransfer,
} from '../dto/tutor/tutor-earnings.dto';
import { TutorPayoutMonthInput } from '../dto/tutor/tutor-payout-month.input';
import { TutorPayoutPeriodInput } from '../dto/tutor/tutor-payout-period.input';
import { TutorEarningsService } from '../services/tutor-earnings.service';

@Resolver()
export class TutorEarningsResolver {
  constructor(private readonly tutorEarningsService: TutorEarningsService) {}

  @Query(() => MyTutorEarningsSummary, {
    name: 'myTutorEarningsSummary',
    description: 'Tutor earnings summary for the current IST calendar month',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TUTOR)
  async myTutorEarningsSummary(@CurrentUser() user: User): Promise<MyTutorEarningsSummary> {
    return this.tutorEarningsService.getSummaryForUser(user);
  }

  @Query(() => MyTutorMonthlyEarnings, {
    name: 'myTutorMonthlyEarnings',
    description: 'Monthly tutor earnings buckets (payable, dispute window, carry-forward)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TUTOR)
  async myTutorMonthlyEarnings(
    @CurrentUser() user: User,
    @Args('input') input: TutorPayoutMonthInput,
  ): Promise<MyTutorMonthlyEarnings> {
    return this.tutorEarningsService.getMonthlyEarningsForUser(user, input);
  }

  @Query(() => MyTutorPayoutPeriodDetail, {
    name: 'myTutorPayoutPeriodDetail',
    description: 'Line-item payout breakdown for an IST date range (authenticated tutor only)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TUTOR)
  async myTutorPayoutPeriodDetail(
    @CurrentUser() user: User,
    @Args('input') input: TutorPayoutPeriodInput,
  ): Promise<MyTutorPayoutPeriodDetail> {
    return this.tutorEarningsService.getPeriodDetailForUser(user, input);
  }

  @Query(() => [TutorPayoutTransfer], {
    name: 'myTutorPayoutTransfers',
    description: 'Bank transfers already paid to the tutor',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TUTOR)
  async myTutorPayoutTransfers(@CurrentUser() user: User): Promise<TutorPayoutTransfer[]> {
    return this.tutorEarningsService.listPaidTransfersForUser(user);
  }
}