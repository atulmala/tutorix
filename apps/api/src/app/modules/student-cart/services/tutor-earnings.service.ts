import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  formatIstMonthLabel,
  istCurrentMonthToDatePeriod,
  istCurrentYearMonth,
  istMonthBounds,
} from '@tutorix/shared-utils';
import { User } from '../../auth/entities/user.entity';
import { PaymentGatewayFeeService } from '../../payment-gateway-fee/services/payment-gateway-fee.service';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { UserBankDetailsService } from '../../user-bank-details/services/user-bank-details.service';
import { TutorPayoutTransferEntity } from '../../payment-processing/entities/tutor-payout-transfer.entity';
import { AdminTutorPayoutCalculationRow } from '../dto/admin/admin-tutor-payout-calculation-result.dto';
import {
  MyTutorEarningsSummary,
  MyTutorMonthlyEarnings,
  MyTutorPayoutPeriodDetail,
  TutorMonthlyEarningsBucket,
  TutorPayoutLineItem,
  TutorPayoutTransfer,
} from '../dto/tutor/tutor-earnings.dto';
import { TutorPayoutMonthInput } from '../dto/tutor/tutor-payout-month.input';
import { TutorPayoutPeriodInput } from '../dto/tutor/tutor-payout-period.input';
import { TutorPayoutCreditBucketEnum } from '../enums/tutor-payout-credit-bucket.enum';
import { AdminTutorPayoutCalculationService } from './admin-tutor-payout-calculation.service';

function toLineItem(row: AdminTutorPayoutCalculationRow): TutorPayoutLineItem {
  return {
    orderItemId: row.orderItemId,
    studentName: row.studentName,
    classesInBooking: row.classesInBooking,
    rateInr: row.rateInr,
    concludedInRange: row.concludedInRange,
    grossInr: row.grossInr,
    commissionPercent: row.commissionPercent,
    commissionInr: row.commissionInr,
    onlineChargesInr: row.onlineChargesInr,
    paymentGatewayProvider: row.paymentGatewayProvider,
    paymentGatewayFeeInr: row.paymentGatewayFeeInr,
    paymentGatewayGstInr: row.paymentGatewayGstInr,
    paymentGatewayChargesInr: row.paymentGatewayChargesInr,
    totalDeductionsInr: row.totalDeductionsInr,
    netPayoutInr: row.netPayoutInr,
  };
}

function emptyBucket(): TutorMonthlyEarningsBucket {
  return { concludedClassCount: 0, totalNetPayoutInr: 0 };
}

@Injectable()
export class TutorEarningsService {
  constructor(
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
    @InjectRepository(TutorPayoutTransferEntity)
    private readonly transferRepo: Repository<TutorPayoutTransferEntity>,
    private readonly adminTutorPayoutCalculationService: AdminTutorPayoutCalculationService,
    private readonly userBankDetailsService: UserBankDetailsService,
    private readonly paymentGatewayFeeService: PaymentGatewayFeeService,
  ) {}

  async getSummaryForUser(user: User, now: Date = new Date()): Promise<MyTutorEarningsSummary> {
    const tutorId = await this.requireTutorId(user.id);
    const bankDetailsComplete = await this.userBankDetailsService.isCompleteForUser(user.id);
    const { year, month } = istCurrentYearMonth(now);
    const monthly = await this.getMonthlyEarningsForTutor(tutorId, { year, month }, now);

    const deferredCount =
      monthly.carriedForward.concludedClassCount + monthly.underDispute.concludedClassCount;
    const deferredNet =
      monthly.carriedForward.totalNetPayoutInr + monthly.underDispute.totalNetPayoutInr;

    let deferredNote: string | null = null;
    if (deferredCount > 0) {
      const parts: string[] = [];
      if (monthly.carriedForward.concludedClassCount > 0) {
        parts.push(
          `${monthly.carriedForward.concludedClassCount} class(es) from earlier months expected in the next payout`,
        );
      }
      if (monthly.underDispute.concludedClassCount > 0) {
        parts.push(
          `${monthly.underDispute.concludedClassCount} class(es) under student dispute`,
        );
      }
      deferredNote = parts.join('; ');
    }

    return {
      bankDetailsComplete,
      year,
      month,
      payable: monthly.payable,
      deferred:
        deferredCount > 0
          ? { concludedClassCount: deferredCount, totalNetPayoutInr: deferredNet }
          : null,
      deferredNote,
    };
  }

  async getMonthlyEarningsForUser(
    user: User,
    input: TutorPayoutMonthInput,
    now: Date = new Date(),
  ): Promise<MyTutorMonthlyEarnings> {
    const tutorId = await this.requireTutorId(user.id);
    return this.getMonthlyEarningsForTutor(tutorId, input, now);
  }

  private async getMonthlyEarningsForTutor(
    tutorId: number,
    input: TutorPayoutMonthInput,
    now: Date,
  ): Promise<MyTutorMonthlyEarnings> {
    const monthBounds = istMonthBounds(input.year, input.month);
    if (!monthBounds) {
      throw new BadRequestException('Invalid month');
    }
    const current = istCurrentYearMonth(now);
    const isCurrentMonth = current.year === input.year && current.month === input.month;

    const selection = isCurrentMonth
      ? istCurrentMonthToDatePeriod(now)
      : { startDate: monthBounds.startDate, endDate: monthBounds.endDate };

    const payable = await this.bucketTotals(
      tutorId,
      input.year,
      input.month,
      TutorPayoutCreditBucketEnum.payable,
      { startDate: selection.startDate, endDate: selection.endDate },
      now,
    );

    const inDisputeWindowTotals = isCurrentMonth
      ? await this.bucketTotals(
          tutorId,
          input.year,
          input.month,
          TutorPayoutCreditBucketEnum.in_dispute_window,
          { startDate: selection.startDate, endDate: selection.endDate },
          now,
        )
      : null;

    const underDispute = await this.bucketTotals(
      tutorId,
      input.year,
      input.month,
      TutorPayoutCreditBucketEnum.under_dispute,
      { startDate: monthBounds.startDate, endDate: selection.endDate },
      now,
    );

    const carriedForward = await this.bucketTotals(
      tutorId,
      input.year,
      input.month,
      TutorPayoutCreditBucketEnum.carried_forward,
      { startDate: selection.startDate, endDate: selection.endDate },
      now,
    );

    const settlementDay = await this.paymentGatewayFeeService.effectiveSettlementDayForEarningsMonth(
      input.year,
      input.month,
    );
    const settlementNote = this.paymentGatewayFeeService.buildSettlementNote(
      input.year,
      input.month,
      settlementDay,
    );

    return {
      monthLabel: formatIstMonthLabel(input.year, input.month) ?? `${input.year}-${input.month}`,
      startDate: monthBounds.startDate,
      endDate: isCurrentMonth ? selection.endDate : monthBounds.endDate,
      settlementDayOfMonth: settlementDay,
      settlementNote,
      payable: {
        concludedClassCount: payable.concludedClassCount,
        totalNetPayoutInr: payable.totalNetPayoutInr,
      },
      inDisputeWindow:
        isCurrentMonth && inDisputeWindowTotals
          ? inDisputeWindowTotals.concludedClassCount > 0
            ? {
                concludedClassCount: inDisputeWindowTotals.concludedClassCount,
                totalNetPayoutInr: inDisputeWindowTotals.totalNetPayoutInr,
              }
            : emptyBucket()
          : null,
      underDispute: {
        concludedClassCount: underDispute.concludedClassCount,
        totalNetPayoutInr: underDispute.totalNetPayoutInr,
      },
      carriedForward: {
        concludedClassCount: carriedForward.concludedClassCount,
        totalNetPayoutInr: carriedForward.totalNetPayoutInr,
      },
    };
  }

  private async bucketTotals(
    tutorId: number,
    year: number,
    month: number,
    bucket: TutorPayoutCreditBucketEnum,
    selection: { startDate: string; endDate: string },
    now: Date,
  ) {
    return this.adminTutorPayoutCalculationService.totalsForTutorBucket(
      tutorId,
      year,
      month,
      bucket,
      selection,
      now,
    );
  }

  async getPeriodDetailForUser(
    user: User,
    input: TutorPayoutPeriodInput,
    now: Date = new Date(),
  ): Promise<MyTutorPayoutPeriodDetail> {
    const tutorId = await this.requireTutorId(user.id);
    const result = await this.adminTutorPayoutCalculationService.calculate(
      {
        startDate: input.startDate,
        endDate: input.endDate,
        page: 1,
        pageSize: 500,
        settlementMode: false,
      },
      { tutorId, now },
    );
    return {
      startDate: input.startDate,
      endDate: input.endDate,
      items: result.items.map(toLineItem),
      totalGrossInr: result.totalGrossInr,
      totalCommissionInr: result.totalCommissionInr,
      totalOnlineChargesInr: result.totalOnlineChargesInr,
      totalPaymentGatewayFeeInr: result.totalPaymentGatewayFeeInr,
      totalPaymentGatewayGstInr: result.totalPaymentGatewayGstInr,
      totalPaymentGatewayChargesInr: result.totalPaymentGatewayChargesInr,
      totalDeductionsInr: result.totalDeductionsInr,
      totalNetPayoutInr: result.totalNetPayoutInr,
    };
  }

  async listPaidTransfersForUser(user: User): Promise<TutorPayoutTransfer[]> {
    const tutorId = await this.requireTutorId(user.id);
    const rows = await this.transferRepo.find({
      where: { tutorId, deleted: false },
      order: { paidAt: 'DESC' },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      paidAt: row.paidAt,
      amountInr: row.amountInr,
      bankAccountLast4: row.bankAccountLast4 ?? null,
      utrReference: row.utrReference ?? null,
    }));
  }

  private async requireTutorId(userId: number): Promise<number> {
    const tutor = await this.tutorRepo.findOne({
      where: { userId, deleted: false },
    });
    if (!tutor) {
      throw new BadRequestException('Tutor profile not found for this user');
    }
    return tutor.id;
  }
}