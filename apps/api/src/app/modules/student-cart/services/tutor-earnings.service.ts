import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  defaultTutorPayoutPeriodIstDates,
  tutorPayoutHoldPeriodIstDates,
} from '@tutorix/shared-utils';
import { User } from '../../auth/entities/user.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { UserBankDetailsService } from '../../user-bank-details/services/user-bank-details.service';
import {
  AdminTutorPayoutCalculationResult,
  AdminTutorPayoutCalculationRow,
} from '../dto/admin/admin-tutor-payout-calculation-result.dto';
import {
  MyTutorEarningsSummary,
  MyTutorPayoutPeriodDetail,
  TutorPayoutLineItem,
  TutorPayoutPeriodTotals,
  TutorPayoutTransfer,
} from '../dto/tutor/tutor-earnings.dto';
import { TutorPayoutPeriodInput } from '../dto/tutor/tutor-payout-period.input';
import { AdminTutorPayoutCalculationService } from './admin-tutor-payout-calculation.service';

function concludedClassCount(rows: AdminTutorPayoutCalculationRow[]): number {
  return rows.reduce((sum, row) => sum + row.concludedInRange, 0);
}

function totalsFromCalculation(
  startDate: string,
  endDate: string,
  result: AdminTutorPayoutCalculationResult,
): TutorPayoutPeriodTotals {
  return {
    startDate,
    endDate,
    concludedClassCount: concludedClassCount(result.items),
    totalGrossInr: result.totalGrossInr,
    totalDeductionsInr: result.totalDeductionsInr,
    totalNetPayoutInr: result.totalNetPayoutInr,
  };
}

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

@Injectable()
export class TutorEarningsService {
  constructor(
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
    private readonly adminTutorPayoutCalculationService: AdminTutorPayoutCalculationService,
    private readonly userBankDetailsService: UserBankDetailsService,
  ) {}

  async getSummaryForUser(user: User, now: Date = new Date()): Promise<MyTutorEarningsSummary> {
    const tutorId = await this.requireTutorId(user.id);
    const bankDetailsComplete = await this.userBankDetailsService.isCompleteForUser(user.id);

    const nextPeriod = defaultTutorPayoutPeriodIstDates(now);
    const nextResult = await this.calculateForTutor(tutorId, nextPeriod, now);

    const holdPeriod = tutorPayoutHoldPeriodIstDates(now);
    let inHold: TutorPayoutPeriodTotals | null = null;
    if (holdPeriod) {
      const holdResult = await this.calculateForTutor(tutorId, holdPeriod, now);
      inHold = totalsFromCalculation(holdPeriod.startDate, holdPeriod.endDate, holdResult);
    }

    return {
      bankDetailsComplete,
      nextPayout: totalsFromCalculation(
        nextPeriod.startDate,
        nextPeriod.endDate,
        nextResult,
      ),
      inHold,
    };
  }

  async getPeriodDetailForUser(
    user: User,
    input: TutorPayoutPeriodInput,
    now: Date = new Date(),
  ): Promise<MyTutorPayoutPeriodDetail> {
    const tutorId = await this.requireTutorId(user.id);
    const result = await this.calculateForTutor(tutorId, input, now);
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

  async listPaidTransfersForUser(_user: User): Promise<TutorPayoutTransfer[]> {
    return [];
  }

  private async calculateForTutor(
    tutorId: number,
    period: { startDate: string; endDate: string },
    now: Date,
  ): Promise<AdminTutorPayoutCalculationResult> {
    return this.adminTutorPayoutCalculationService.calculate(
      {
        startDate: period.startDate,
        endDate: period.endDate,
        page: 1,
        pageSize: 500,
      },
      { tutorId, now },
    );
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
