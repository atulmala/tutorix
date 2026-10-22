import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CommunicationAudience } from '../../communication/enums/communication-audience.enum';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { CommunicationService } from '../../communication/communication.service';
import { PaymentAttemptEntity } from '../../commerce/entities/payment-attempt.entity';
import { PaymentAttemptStatusEnum } from '../../commerce/enums/commerce.enums';
import { RazorpayGateway } from '../../payment/services/payment-gateways';
import { WalletService } from '../../wallet/services/wallet.service';
import { WalletTransactionEntity } from '../../wallet/entities/wallet-transaction.entity';
import { allocateGatewayRefund } from '../class-credit-refund-allocation.util';
import { formatInrAmount } from '../class-booking-email-table.util';
import { ClassCancellationRefundRequestEntity } from '../entities/class-cancellation-refund-request.entity';
import { ClassCreditCancellationEntity } from '../entities/class-credit-cancellation.entity';
import { ClassCreditGatewayRefundEntity } from '../entities/class-credit-gateway-refund.entity';
import { StudentClassCreditEntity } from '../entities/student-class-credit.entity';
import { ClassCancellationRefundInitiatedByEnum } from '../enums/class-cancellation-refund-initiated-by.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../enums/class-cancellation-refund-payout-status.enum';
import { ClassCreditRefundMethodEnum } from '../enums/class-credit-refund-method.enum';
import { ClassCancellationRefundRequestService } from './class-cancellation-refund-request.service';
import { WALLET_REF_CLASS_CANCELLATION_REFUND } from '../../wallet/constants/wallet-reference-type';

function personName(
  user?: { firstName?: string | null; lastName?: string | null } | null,
): string {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
}

@Injectable()
export class ClassCancellationRefundPayoutService {
  private readonly logger = new Logger(ClassCancellationRefundPayoutService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly razorpayGateway: RazorpayGateway,
    private readonly communicationService: CommunicationService,
    private readonly refundRequestService: ClassCancellationRefundRequestService,
    @InjectRepository(ClassCancellationRefundRequestEntity)
    private readonly requestRepo: Repository<ClassCancellationRefundRequestEntity>,
    @InjectRepository(ClassCreditCancellationEntity)
    private readonly cancellationRepo: Repository<ClassCreditCancellationEntity>,
    @InjectRepository(PaymentAttemptEntity)
    private readonly paymentAttemptRepo: Repository<PaymentAttemptEntity>,
    @InjectRepository(ClassCreditGatewayRefundEntity)
    private readonly gatewayRefundRepo: Repository<ClassCreditGatewayRefundEntity>,
    @InjectRepository(StudentClassCreditEntity)
    private readonly creditRepo: Repository<StudentClassCreditEntity>,
  ) {}

  async processRefund(requestId: number, adminUserId: number): Promise<ClassCancellationRefundRequestEntity> {
    const request = await this.refundRequestService.findById(requestId);
    if (!request) {
      throw new NotFoundException('Refund request not found');
    }
    if (request.payoutStatus === ClassCancellationRefundPayoutStatusEnum.completed) {
      return request;
    }
    if (request.payoutStatus === ClassCancellationRefundPayoutStatusEnum.processing) {
      throw new BadRequestException('Refund is already processing');
    }
    if (request.amountInr <= 0) {
      throw new BadRequestException('Nothing to refund');
    }

    const studentUserId = request.student?.userId;
    if (!studentUserId) {
      throw new BadRequestException('Student user not found');
    }

    const cancellations = await this.cancellationRepo.find({
      where: { refundRequestId: requestId, deleted: false },
    });
    const firstCreditId = cancellations[0]?.creditId;
    const credit =
      firstCreditId != null
        ? await this.creditRepo.findOne({ where: { id: firstCreditId, deleted: false } })
        : null;

    if (request.refundMethod === ClassCreditRefundMethodEnum.wallet) {
      let walletTransactionId: number | null = null;
      await this.dataSource.transaction(async (manager) => {
        const locked = await manager
          .getRepository(ClassCancellationRefundRequestEntity)
          .createQueryBuilder('r')
          .setLock('pessimistic_write')
          .where('r.id = :id', { id: requestId })
          .andWhere('r.deleted = false')
          .getOne();
        if (!locked || locked.payoutStatus === ClassCancellationRefundPayoutStatusEnum.completed) {
          return;
        }
        locked.payoutStatus = ClassCancellationRefundPayoutStatusEnum.processing;
        await manager.getRepository(ClassCancellationRefundRequestEntity).save(locked);

        await this.walletService.creditClassRefundWithManager(manager, {
          userId: studentUserId,
          amountInr: request.amountInr,
          commerceOrderId: credit?.orderId ?? request.orderId ?? undefined,
          referenceType: WALLET_REF_CLASS_CANCELLATION_REFUND,
          referenceId: requestId,
          description:
            request.classCount === 1
              ? 'Class cancellation refund'
              : `Class cancellation refund · ${request.classCount} classes`,
        });

        const tx = await manager.getRepository(WalletTransactionEntity).findOne({
          where: {
            userId: studentUserId,
            referenceType: WALLET_REF_CLASS_CANCELLATION_REFUND,
            referenceId: requestId,
            deleted: false,
          },
          order: { id: 'DESC' },
        });
        walletTransactionId = tx?.id ?? null;

        locked.payoutStatus = ClassCancellationRefundPayoutStatusEnum.completed;
        locked.processedAt = new Date();
        locked.processedByUserId = adminUserId;
        locked.walletTransactionId = walletTransactionId;
        locked.failureReason = null;
        await manager.getRepository(ClassCancellationRefundRequestEntity).save(locked);
      });

      const completed = await this.refundRequestService.findById(requestId);
      if (completed?.payoutStatus === ClassCancellationRefundPayoutStatusEnum.completed) {
        await this.emitRefundCompleted(completed);
      }
      return completed ?? request;
    }

    const gatewayRefunds = await this.refundThroughGateway(
      studentUserId,
      request.amountInr,
      requestId,
      request.orderId ?? undefined,
    );

    await this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .getRepository(ClassCancellationRefundRequestEntity)
        .createQueryBuilder('r')
        .setLock('pessimistic_write')
        .where('r.id = :id', { id: requestId })
        .getOne();
      if (!locked) {
        return;
      }
      locked.payoutStatus = ClassCancellationRefundPayoutStatusEnum.processing;
      locked.processedByUserId = adminUserId;
      locked.processedAt = new Date();
      await manager.getRepository(ClassCancellationRefundRequestEntity).save(locked);

      for (const refund of gatewayRefunds) {
        await manager.getRepository(ClassCreditGatewayRefundEntity).save(
          manager.getRepository(ClassCreditGatewayRefundEntity).create({
            userId: studentUserId,
            paymentAttemptId: refund.paymentAttemptId,
            gatewayPaymentId: refund.gatewayPaymentId,
            gatewayRefundId: refund.gatewayRefundId,
            amountInr: refund.amountInr,
            refundRequestId: requestId,
          }),
        );
      }
    });

    const synced = await this.syncGatewayRefundStatus(requestId);
    return synced ?? (await this.refundRequestService.findById(requestId)) ?? request;
  }

  async syncGatewayRefundStatus(
    requestId: number,
  ): Promise<ClassCancellationRefundRequestEntity | null> {
    const request = await this.refundRequestService.findById(requestId);
    if (!request) {
      return null;
    }
    if (request.refundMethod !== ClassCreditRefundMethodEnum.gateway) {
      return request;
    }
    if (request.payoutStatus === ClassCancellationRefundPayoutStatusEnum.completed) {
      return request;
    }

    const gatewayRows = await this.gatewayRefundRepo.find({
      where: { refundRequestId: requestId, deleted: false },
    });
    if (gatewayRows.length === 0) {
      return request;
    }

    let allProcessed = true;
    for (const row of gatewayRows) {
      const status = await this.razorpayGateway.fetchRefundStatus(row.gatewayRefundId);
      if (status !== 'processed') {
        allProcessed = false;
      }
    }

    if (!allProcessed) {
      return request;
    }

    request.payoutStatus = ClassCancellationRefundPayoutStatusEnum.completed;
    request.failureReason = null;
    if (!request.processedAt) {
      request.processedAt = new Date();
    }
    await this.requestRepo.save(request);
    await this.emitRefundCompleted(request);
    return request;
  }

  async findProcessingGatewayRequests(limit: number): Promise<ClassCancellationRefundRequestEntity[]> {
    return this.requestRepo.find({
      where: {
        deleted: false,
        refundMethod: ClassCreditRefundMethodEnum.gateway,
        payoutStatus: ClassCancellationRefundPayoutStatusEnum.processing,
      },
      order: { id: 'ASC' },
      take: limit,
    });
  }

  private async refundThroughGateway(
    userId: number,
    amountInr: number,
    refundRequestId: number,
    preferredOrderId?: number,
  ): Promise<
    Array<{
      paymentAttemptId: number;
      gatewayPaymentId: string;
      gatewayRefundId: string;
      amountInr: number;
    }>
  > {
    const rawAttempts = await this.paymentAttemptRepo
      .createQueryBuilder('attempt')
      .innerJoin('attempt.order', 'order')
      .where('order.user_id = :userId', { userId })
      .andWhere('attempt.status = :status', { status: PaymentAttemptStatusEnum.paid })
      .andWhere('attempt.gateway_payment_id IS NOT NULL')
      .andWhere('attempt.deleted = false')
      .getMany();

    const attempts = [...rawAttempts].sort((left, right) => {
      if (preferredOrderId != null) {
        const leftPref = left.orderId === preferredOrderId ? 1 : 0;
        const rightPref = right.orderId === preferredOrderId ? 1 : 0;
        if (leftPref !== rightPref) {
          return rightPref - leftPref;
        }
      }
      return right.id - left.id;
    });

    const refundedRows = await this.gatewayRefundRepo
      .createQueryBuilder('refund')
      .select('refund.payment_attempt_id', 'paymentAttemptId')
      .addSelect('SUM(refund.amount_inr)', 'total')
      .where('refund.user_id = :userId', { userId })
      .andWhere('refund.deleted = false')
      .groupBy('refund.payment_attempt_id')
      .getRawMany<{ paymentAttemptId: string; total: string }>();
    const refundedByAttempt = new Map(
      refundedRows.map((row) => [Number(row.paymentAttemptId), Number(row.total)]),
    );

    const slices = allocateGatewayRefund(
      amountInr,
      attempts.map((attempt: PaymentAttemptEntity) => ({
        paymentAttemptId: attempt.id,
        gatewayPaymentId: attempt.gatewayPaymentId ?? '',
        amountInr: attempt.amountInr,
        refundedInr: refundedByAttempt.get(attempt.id) ?? 0,
      })),
    );
    if (slices.length === 0) {
      throw new BadRequestException(
        'This amount cannot be refunded to the payment method. Use wallet instead.',
      );
    }

    const completed: Array<{
      paymentAttemptId: number;
      gatewayPaymentId: string;
      gatewayRefundId: string;
      amountInr: number;
    }> = [];
    for (const slice of slices) {
      try {
        const gatewayRefundId = await this.razorpayGateway.refundPayment(
          slice.gatewayPaymentId,
          slice.amountInr,
          { receipt: `cc-ref-${refundRequestId}` },
        );
        completed.push({ ...slice, gatewayRefundId });
      } catch (error) {
        this.logger.error(
          `Gateway refund failed for request ${refundRequestId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await this.requestRepo.update(refundRequestId, {
          payoutStatus: ClassCancellationRefundPayoutStatusEnum.failed,
          failureReason:
            error instanceof Error ? error.message : 'Gateway refund failed',
        });
        throw new BadRequestException(
          'The payment gateway could not process this refund.',
        );
      }
    }
    return completed;
  }

  private async emitRefundCompleted(
    request: ClassCancellationRefundRequestEntity,
  ): Promise<void> {
    const studentUserId = request.student?.userId;
    if (!studentUserId) {
      return;
    }
    const studentName = personName(request.student?.user) || 'Student';
    const tutorName = personName(request.tutor?.user) || 'Your tutor';
    const offeringName =
      request.tutorOffering?.offering?.displayName ?? 'Class';
    const isTutorInitiated =
      request.initiatedBy === ClassCancellationRefundInitiatedByEnum.tutor;
    const breakdown = request.refundBreakdownJson as { breakdownText?: string } | null;
    try {
      await this.communicationService.emit({
        event: CommunicationEvent.CLASS_CANCELLATION_REFUND_COMPLETED,
        userId: studentUserId,
        audience: CommunicationAudience.STUDENT,
        entityType: 'class_cancellation_refund_request',
        entityId: request.id,
        payload: {
          studentName,
          tutorName,
          offeringName,
          classCount: String(request.classCount),
          amountRefunded: formatInrAmount(request.amountInr),
          refundMethodLabel:
            request.refundMethod === ClassCreditRefundMethodEnum.wallet
              ? 'Wallet'
              : 'Cash to payment method',
          initiatedByLabel: isTutorInitiated ? 'Your tutor' : 'You',
          isTutorInitiated: isTutorInitiated ? 'true' : 'false',
          requestId: String(request.id),
          breakdownText: breakdown?.breakdownText ?? '',
        },
      });
    } catch (error) {
      this.logger.warn(
        `Refund completed emit failed for request ${request.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
