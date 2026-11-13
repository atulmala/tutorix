import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { UserBankDetailsEntity } from '../../user-bank-details/entities/user-bank-details.entity';
import { PaymentDisbursementEntity } from '../entities/payment-disbursement.entity';
import { TutorPayoutTransferEntity } from '../entities/tutor-payout-transfer.entity';
import { PaymentDisbursementStatusEnum } from '../enums/payment-disbursement-status.enum';
import {
  buildCashfreeTransferId,
  CashfreePayoutGateway,
  CashfreePayoutResult,
  normalizeCashfreeTransferStatus,
  TUTOR_PAYOUT_PROVIDER_CASHFREE,
} from './cashfree-payout.gateway';

@Injectable()
export class CashfreeTutorPayoutService {
  constructor(
    @InjectRepository(PaymentDisbursementEntity)
    private readonly disbursementRepo: Repository<PaymentDisbursementEntity>,
    @InjectRepository(TutorPayoutTransferEntity)
    private readonly transferRepo: Repository<TutorPayoutTransferEntity>,
    @InjectRepository(UserBankDetailsEntity)
    private readonly bankDetailsRepo: Repository<UserBankDetailsEntity>,
    private readonly cashfreePayoutGateway: CashfreePayoutGateway,
  ) {}

  isSelected(): Promise<boolean> {
    return this.cashfreePayoutGateway.isSelected();
  }

  isCashfreeDisbursement(row: PaymentDisbursementEntity): boolean {
    return row.payoutProvider === TUTOR_PAYOUT_PROVIDER_CASHFREE;
  }

  async executeTransfer(
    row: PaymentDisbursementEntity,
    tutorUser: User,
    bank: UserBankDetailsEntity,
  ): Promise<void> {
    row.payoutProvider = TUTOR_PAYOUT_PROVIDER_CASHFREE;
    try {
      const beneficiaryId = await this.cashfreePayoutGateway.ensureBeneficiaryForUser(
        tutorUser,
        bank,
      );
      const transferId = buildCashfreeTransferId(row.id);
      row.gatewayPayoutId = transferId;
      await this.disbursementRepo.save(row);

      const result = await this.cashfreePayoutGateway.createTransfer({
        beneficiaryId,
        amountInr: row.amountInr,
        transferId,
        remarks: `Tutor payout ${row.periodStartDate ?? ''}`,
      });
      row.processedAt = new Date();
      await this.applyStatus(row, result);
    } catch (error) {
      row.status = PaymentDisbursementStatusEnum.failed;
      row.failureReason = error instanceof Error ? error.message : 'Payout failed';
      await this.disbursementRepo.save(row);
      throw new BadRequestException(row.failureReason);
    }
  }

  async sync(row: PaymentDisbursementEntity): Promise<void> {
    if (!row.gatewayPayoutId) {
      return;
    }
    const result = await this.cashfreePayoutGateway.fetchTransfer(row.gatewayPayoutId);
    if (!result) {
      return;
    }
    await this.applyStatus(row, result);
  }

  async handleWebhook(transferId: string, rawStatus: string, utr: string | null): Promise<void> {
    const row = await this.disbursementRepo.findOne({
      where: {
        gatewayPayoutId: transferId,
        payoutProvider: TUTOR_PAYOUT_PROVIDER_CASHFREE,
        deleted: false,
      },
    });
    if (!row) {
      return;
    }
    await this.applyStatus(row, {
      transferId,
      rawStatus,
      status: normalizeCashfreeTransferStatus(rawStatus),
      utr,
    });
  }

  private async applyStatus(
    row: PaymentDisbursementEntity,
    result: CashfreePayoutResult,
  ): Promise<void> {
    if (result.utr) {
      row.gatewayUtr = result.utr;
    }

    if (result.status === 'processed') {
      row.status = PaymentDisbursementStatusEnum.completed;
      row.processedAt = row.processedAt ?? new Date();
      row.failureReason = null;
      await this.disbursementRepo.save(row);
      await this.ensureTransferRecord(row);
      return;
    }

    if (result.status === 'failed' || result.status === 'reversed') {
      row.status = PaymentDisbursementStatusEnum.failed;
      row.failureReason = [
        `Cashfree payout ${result.rawStatus.toLowerCase()}`,
        result.statusDescription,
      ]
        .filter(Boolean)
        .join(': ');
      await this.disbursementRepo.save(row);
      return;
    }

    row.status = PaymentDisbursementStatusEnum.processing;
    await this.disbursementRepo.save(row);
  }

  private async ensureTransferRecord(row: PaymentDisbursementEntity): Promise<void> {
    if (row.tutorId == null || !row.periodStartDate || !row.periodEndDate) {
      return;
    }

    const existing = await this.transferRepo.findOne({
      where: { paymentDisbursementId: row.id, deleted: false },
    });
    if (existing) {
      return;
    }

    const bank = await this.bankDetailsRepo.findOne({
      where: { userId: row.payeeUserId, deleted: false },
    });

    await this.transferRepo.save(
      this.transferRepo.create({
        tutorId: row.tutorId,
        periodStartDate: row.periodStartDate,
        periodEndDate: row.periodEndDate,
        amountInr: row.amountInr,
        paidAt: row.processedAt ?? new Date(),
        bankAccountLast4: bank?.accountNumber?.slice(-4) ?? null,
        utrReference: row.gatewayUtr ?? null,
        paymentDisbursementId: row.id,
      }),
    );
  }
}
