import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassCancellationRefundRequestEntity } from '../../student-cart/entities/class-cancellation-refund-request.entity';
import { ClassCancellationRefundAiStatusEnum } from '../../student-cart/enums/class-cancellation-refund-ai-status.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../../student-cart/enums/class-cancellation-refund-payout-status.enum';
import { ClassCreditRefundMethodEnum } from '../../student-cart/enums/class-credit-refund-method.enum';
import { PaymentDisbursementEntity } from '../entities/payment-disbursement.entity';
import { PaymentDisbursementKindEnum } from '../enums/payment-disbursement-kind.enum';
import { PaymentDisbursementSourceTypeEnum } from '../enums/payment-disbursement-source-type.enum';
import { PaymentDisbursementStatusEnum } from '../enums/payment-disbursement-status.enum';

@Injectable()
export class PaymentDisbursementEnqueueService {
  private readonly logger = new Logger(PaymentDisbursementEnqueueService.name);

  constructor(
    @InjectRepository(PaymentDisbursementEntity)
    private readonly disbursementRepo: Repository<PaymentDisbursementEntity>,
    @InjectRepository(ClassCancellationRefundRequestEntity)
    private readonly refundRequestRepo: Repository<ClassCancellationRefundRequestEntity>,
  ) {}

  async syncForRefundRequest(refundRequestId: number): Promise<void> {
    const request = await this.refundRequestRepo.findOne({
      where: { id: refundRequestId, deleted: false },
      relations: ['student'],
    });
    if (!request) {
      return;
    }

    const existing = await this.disbursementRepo.findOne({
      where: {
        classCancellationRefundRequestId: refundRequestId,
        deleted: false,
      },
    });

    if (request.payoutStatus === ClassCancellationRefundPayoutStatusEnum.completed) {
      if (existing && existing.status !== PaymentDisbursementStatusEnum.completed) {
        existing.status = PaymentDisbursementStatusEnum.completed;
        await this.disbursementRepo.save(existing);
      }
      return;
    }

    if (request.aiStatus !== ClassCancellationRefundAiStatusEnum.approved) {
      if (
        existing &&
        existing.status === PaymentDisbursementStatusEnum.ready
      ) {
        existing.status = PaymentDisbursementStatusEnum.cancelled;
        await this.disbursementRepo.save(existing);
      }
      return;
    }

    if (request.amountInr <= 0) {
      return;
    }

    const studentUserId = request.student?.userId;
    if (!studentUserId) {
      this.logger.warn(`Refund request ${refundRequestId} has no student user id`);
      return;
    }

    const kind =
      request.refundMethod === ClassCreditRefundMethodEnum.wallet
        ? PaymentDisbursementKindEnum.student_refund_wallet
        : PaymentDisbursementKindEnum.student_refund_gateway;

    if (existing) {
      if (existing.status === PaymentDisbursementStatusEnum.cancelled) {
        existing.status = PaymentDisbursementStatusEnum.ready;
      }
      existing.kind = kind;
      existing.amountInr = request.amountInr;
      existing.payeeUserId = studentUserId;
      await this.disbursementRepo.save(existing);
      return;
    }

    await this.disbursementRepo.save(
      this.disbursementRepo.create({
        kind,
        status: PaymentDisbursementStatusEnum.ready,
        payeeUserId: studentUserId,
        amountInr: request.amountInr,
        sourceType: PaymentDisbursementSourceTypeEnum.class_cancellation_refund_request,
        sourceId: refundRequestId,
        classCancellationRefundRequestId: refundRequestId,
      }),
    );
  }
}
