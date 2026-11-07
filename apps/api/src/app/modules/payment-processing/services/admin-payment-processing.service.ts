import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { UserBankDetailsService } from '../../user-bank-details/services/user-bank-details.service';
import { UserBankDetailsEntity } from '../../user-bank-details/entities/user-bank-details.entity';
import { ClassCancellationRefundPayoutService } from '../../student-cart/services/class-cancellation-refund-payout.service';
import { AdminTutorPayoutCalculationService } from '../../student-cart/services/admin-tutor-payout-calculation.service';
import { ClassCancellationRefundRequestEntity } from '../../student-cart/entities/class-cancellation-refund-request.entity';
import { PostClassRefundClaimEntity } from '../../student-cart/entities/post-class-refund-claim.entity';
import { ClassCreditGatewayRefundEntity } from '../../student-cart/entities/class-credit-gateway-refund.entity';
import { ClassCancellationRefundAiStatusEnum } from '../../student-cart/enums/class-cancellation-refund-ai-status.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../../student-cart/enums/class-cancellation-refund-payout-status.enum';
import { PostClassRefundAdminStatusEnum } from '../../student-cart/enums/post-class-refund-admin-status.enum';
import { RazorpayGateway } from '../../payment/services/payment-gateways';
import {
  AdminPaymentDisbursementDetail,
  AdminPaymentDisbursementGatewayRefund,
  AdminPaymentDisbursementListItem,
  AdminPaymentDisbursementListResult,
  AdminSubmitTutorPayoutDisbursementsResult,
} from '../dto/admin/admin-payment-disbursement.dto';
import {
  AdminPaymentDisbursementListInput,
  AdminSubmitTutorPayoutDisbursementsInput,
} from '../dto/admin/admin-payment-disbursement.input';
import { PaymentDisbursementEntity } from '../entities/payment-disbursement.entity';
import { TutorPayoutTransferEntity } from '../entities/tutor-payout-transfer.entity';
import { PaymentDisbursementKindEnum } from '../enums/payment-disbursement-kind.enum';
import { PaymentDisbursementSourceTypeEnum } from '../enums/payment-disbursement-source-type.enum';
import { PaymentDisbursementStatusEnum } from '../enums/payment-disbursement-status.enum';
import { PaymentDisbursementEnqueueService } from './payment-disbursement-enqueue.service';
import { RazorpayXPayoutGateway } from './razorpayx-payout.gateway';
import { RefundPayoutCompletionService } from './refund-payout-completion.service';

function personName(user?: User | null): string {
  if (!user) {
    return '';
  }
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

@Injectable()
export class AdminPaymentProcessingService {
  constructor(
    @InjectRepository(PaymentDisbursementEntity)
    private readonly disbursementRepo: Repository<PaymentDisbursementEntity>,
    @InjectRepository(TutorPayoutTransferEntity)
    private readonly transferRepo: Repository<TutorPayoutTransferEntity>,
    @InjectRepository(ClassCancellationRefundRequestEntity)
    private readonly refundRequestRepo: Repository<ClassCancellationRefundRequestEntity>,
    @InjectRepository(PostClassRefundClaimEntity)
    private readonly claimRepo: Repository<PostClassRefundClaimEntity>,
    @InjectRepository(ClassCreditGatewayRefundEntity)
    private readonly gatewayRefundRepo: Repository<ClassCreditGatewayRefundEntity>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
    @InjectRepository(UserBankDetailsEntity)
    private readonly bankDetailsRepo: Repository<UserBankDetailsEntity>,
    @Inject(forwardRef(() => ClassCancellationRefundPayoutService))
    private readonly refundPayoutService: ClassCancellationRefundPayoutService,
    private readonly adminTutorPayoutCalculationService: AdminTutorPayoutCalculationService,
    private readonly userBankDetailsService: UserBankDetailsService,
    private readonly enqueueService: PaymentDisbursementEnqueueService,
    private readonly completionService: RefundPayoutCompletionService,
    private readonly razorpayXPayoutGateway: RazorpayXPayoutGateway,
    private readonly razorpayGateway: RazorpayGateway,
  ) {}

  async list(input: AdminPaymentDisbursementListInput): Promise<AdminPaymentDisbursementListResult> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));

    const qb = this.disbursementRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.payeeUser', 'payeeUser')
      .where('d.deleted = false');

    if (input.kind) {
      qb.andWhere('d.kind = :kind', { kind: input.kind });
    }
    if (input.status) {
      qb.andWhere('d.status = :status', { status: input.status });
    }
    if (input.refundRequestId != null) {
      qb.andWhere('d.class_cancellation_refund_request_id = :refundRequestId', {
        refundRequestId: input.refundRequestId,
      });
    }
    const payeeSearch = input.payeeSearch?.trim();
    if (payeeSearch) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('payeeUser.firstName ILIKE :q', { q: `%${payeeSearch}%` })
            .orWhere('payeeUser.lastName ILIKE :q', { q: `%${payeeSearch}%` })
            .orWhere('payeeUser.email ILIKE :q', { q: `%${payeeSearch}%` });
        }),
      );
    }

    qb.orderBy('d.id', 'DESC');
    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      items: rows.map((row) => this.toListItem(row)),
      total,
      page,
      pageSize,
    };
  }

  async getDetail(id: number): Promise<AdminPaymentDisbursementDetail> {
    const row = await this.disbursementRepo.findOne({
      where: { id, deleted: false },
      relations: ['payeeUser', 'classCancellationRefundRequest', 'classCancellationRefundRequest.student'],
    });
    if (!row) {
      throw new NotFoundException('Payment disbursement not found');
    }

    const base = this.toListItem(row);
    const detail: AdminPaymentDisbursementDetail = {
      ...base,
      orderId: row.classCancellationRefundRequest?.orderId ?? null,
      studentId: row.classCancellationRefundRequest?.studentId ?? null,
      refundMethod: row.classCancellationRefundRequest?.refundMethod ?? null,
      refundPayoutStatus: row.classCancellationRefundRequest?.payoutStatus ?? null,
      gatewayPayoutId: row.gatewayPayoutId ?? null,
      gatewayUtr: row.gatewayUtr ?? null,
      walletTransactionId: row.walletTransactionId ?? null,
      processedAt: row.processedAt ?? null,
      gatewayRefunds: null,
    };

    if (row.classCancellationRefundRequestId != null) {
      const gatewayRows = await this.gatewayRefundRepo.find({
        where: {
          refundRequestId: row.classCancellationRefundRequestId,
          deleted: false,
        },
      });
      const gatewayRefunds: AdminPaymentDisbursementGatewayRefund[] = [];
      for (const gatewayRow of gatewayRows) {
        let razorpayRefundStatus: string | null = null;
        try {
          razorpayRefundStatus = await this.razorpayGateway.fetchRefundStatus(
            gatewayRow.gatewayRefundId,
          );
        } catch {
          razorpayRefundStatus = null;
        }
        gatewayRefunds.push({
          id: gatewayRow.id,
          gatewayPaymentId: gatewayRow.gatewayPaymentId,
          gatewayRefundId: gatewayRow.gatewayRefundId,
          amountInr: gatewayRow.amountInr,
          razorpayRefundStatus,
        });
      }
      detail.gatewayRefunds = gatewayRefunds;
    }

    return detail;
  }

  async executeDisbursementForRefundRequest(
    refundRequestId: number,
    adminUserId: number,
  ): Promise<AdminPaymentDisbursementDetail> {
    await this.enqueueService.syncForRefundRequest(refundRequestId);
    const disbursement = await this.disbursementRepo.findOne({
      where: {
        classCancellationRefundRequestId: refundRequestId,
        deleted: false,
      },
    });
    if (!disbursement) {
      throw new BadRequestException('No payment disbursement is ready for this refund request');
    }
    return this.executeDisbursement(disbursement.id, adminUserId);
  }

  async executeDisbursement(id: number, adminUserId: number): Promise<AdminPaymentDisbursementDetail> {
    const row = await this.disbursementRepo.findOne({
      where: { id, deleted: false },
      relations: ['payeeUser', 'tutor', 'tutor.user'],
    });
    if (!row) {
      throw new NotFoundException('Payment disbursement not found');
    }
    if (row.status === PaymentDisbursementStatusEnum.completed) {
      return this.getDetail(id);
    }
    if (row.status === PaymentDisbursementStatusEnum.processing) {
      throw new BadRequestException('Payment is already processing');
    }
    if (row.status !== PaymentDisbursementStatusEnum.ready && row.status !== PaymentDisbursementStatusEnum.failed) {
      throw new BadRequestException('This disbursement cannot be executed');
    }

    row.processedByUserId = adminUserId;
    row.failureReason = null;

    if (
      row.kind === PaymentDisbursementKindEnum.student_refund_wallet ||
      row.kind === PaymentDisbursementKindEnum.student_refund_gateway
    ) {
      await this.executeStudentRefundDisbursement(row, adminUserId);
    } else if (row.kind === PaymentDisbursementKindEnum.tutor_bank_payout) {
      await this.executeTutorPayoutDisbursement(row, adminUserId);
    } else {
      throw new BadRequestException('Unsupported disbursement kind');
    }

    return this.getDetail(id);
  }

  async syncDisbursement(id: number): Promise<AdminPaymentDisbursementDetail> {
    const row = await this.disbursementRepo.findOne({
      where: { id, deleted: false },
    });
    if (!row) {
      throw new NotFoundException('Payment disbursement not found');
    }

    if (
      row.kind === PaymentDisbursementKindEnum.student_refund_gateway &&
      row.classCancellationRefundRequestId != null
    ) {
      await this.refundPayoutService.syncGatewayRefundStatus(row.classCancellationRefundRequestId);
      await this.syncStudentRefundDisbursementFromRequest(row.classCancellationRefundRequestId);
    } else if (row.kind === PaymentDisbursementKindEnum.tutor_bank_payout && row.gatewayPayoutId) {
      await this.syncTutorPayoutFromGateway(row);
    }

    return this.getDetail(id);
  }

  async syncStudentRefundDisbursementFromRequest(refundRequestId: number): Promise<void> {
    const request = await this.refundRequestRepo.findOne({
      where: { id: refundRequestId, deleted: false },
    });
    if (!request) {
      return;
    }

    const disbursement = await this.disbursementRepo.findOne({
      where: {
        classCancellationRefundRequestId: refundRequestId,
        deleted: false,
      },
    });
    if (!disbursement) {
      return;
    }

    if (request.payoutStatus === ClassCancellationRefundPayoutStatusEnum.completed) {
      disbursement.status = PaymentDisbursementStatusEnum.completed;
      disbursement.walletTransactionId = request.walletTransactionId ?? disbursement.walletTransactionId;
      disbursement.processedAt = request.processedAt ?? disbursement.processedAt ?? new Date();
      disbursement.failureReason = null;
      await this.disbursementRepo.save(disbursement);
      await this.completionService.onRefundRequestPayoutCompleted(refundRequestId);
      return;
    }

    if (request.payoutStatus === ClassCancellationRefundPayoutStatusEnum.processing) {
      disbursement.status = PaymentDisbursementStatusEnum.processing;
      await this.disbursementRepo.save(disbursement);
      return;
    }

    if (request.payoutStatus === ClassCancellationRefundPayoutStatusEnum.failed) {
      disbursement.status = PaymentDisbursementStatusEnum.failed;
      disbursement.failureReason = request.failureReason ?? 'Refund failed';
      await this.disbursementRepo.save(disbursement);
    }
  }

  async submitTutorPayoutDisbursements(
    input: AdminSubmitTutorPayoutDisbursementsInput,
  ): Promise<AdminSubmitTutorPayoutDisbursementsResult> {
    const calculation = await this.adminTutorPayoutCalculationService.calculate(
      {
        startDate: input.startDate,
        endDate: input.endDate,
        tutorSearch: input.tutorSearch,
        page: 1,
        pageSize: 10_000,
      },
      { includeAllRows: true },
    );

    const byTutor = new Map<
      number,
      {
        tutorId: number;
        tutorUserId: number;
        tutorName: string;
        netTotal: number;
        lines: typeof calculation.items;
      }
    >();

    for (const line of calculation.items) {
      if (line.tutorId == null) {
        continue;
      }
      let bucket = byTutor.get(line.tutorId);
      if (!bucket) {
        const tutor = await this.tutorRepo.findOne({
          where: { id: line.tutorId, deleted: false },
        });
        if (!tutor?.userId) {
          continue;
        }
        bucket = {
          tutorId: line.tutorId,
          tutorUserId: tutor.userId,
          tutorName: line.tutorName,
          netTotal: 0,
          lines: [],
        };
        byTutor.set(line.tutorId, bucket);
      }
      bucket.netTotal += line.netPayoutInr;
      bucket.lines.push(line);
    }

    let createdCount = 0;
    let skippedAlreadySubmitted = 0;
    let skippedMissingBank = 0;
    let skippedZeroAmount = 0;

    for (const bucket of byTutor.values()) {
      if (bucket.netTotal <= 0) {
        skippedZeroAmount += 1;
        continue;
      }

      const bankComplete = await this.userBankDetailsService.isCompleteForUser(bucket.tutorUserId);
      if (!bankComplete) {
        skippedMissingBank += 1;
        continue;
      }

      const existing = await this.disbursementRepo.findOne({
        where: {
          deleted: false,
          kind: PaymentDisbursementKindEnum.tutor_bank_payout,
          tutorId: bucket.tutorId,
          periodStartDate: input.startDate,
          periodEndDate: input.endDate,
        },
      });
      if (
        existing &&
        existing.status !== PaymentDisbursementStatusEnum.cancelled &&
        existing.status !== PaymentDisbursementStatusEnum.failed
      ) {
        skippedAlreadySubmitted += 1;
        continue;
      }

      if (existing?.status === PaymentDisbursementStatusEnum.failed) {
        existing.status = PaymentDisbursementStatusEnum.ready;
        existing.amountInr = bucket.netTotal;
        existing.payeeUserId = bucket.tutorUserId;
        existing.calculationSnapshotJson = {
          tutorName: bucket.tutorName,
          lines: bucket.lines,
        };
        existing.failureReason = null;
        await this.disbursementRepo.save(existing);
        createdCount += 1;
        continue;
      }

      await this.disbursementRepo.save(
        this.disbursementRepo.create({
          kind: PaymentDisbursementKindEnum.tutor_bank_payout,
          status: PaymentDisbursementStatusEnum.ready,
          payeeUserId: bucket.tutorUserId,
          amountInr: bucket.netTotal,
          sourceType: PaymentDisbursementSourceTypeEnum.tutor_payout_period,
          sourceId: bucket.tutorId,
          tutorId: bucket.tutorId,
          periodStartDate: input.startDate,
          periodEndDate: input.endDate,
          calculationSnapshotJson: {
            tutorName: bucket.tutorName,
            lines: bucket.lines,
          },
        }),
      );
      createdCount += 1;
    }

    return {
      createdCount,
      skippedAlreadySubmitted,
      skippedMissingBank,
      skippedZeroAmount,
    };
  }

  async handleRazorpayPayoutWebhook(payoutId: string, status: string, utr?: string | null): Promise<void> {
    const disbursement = await this.disbursementRepo.findOne({
      where: { gatewayPayoutId: payoutId, deleted: false },
      relations: ['tutor', 'tutor.user'],
    });
    if (!disbursement) {
      return;
    }
    await this.applyTutorPayoutGatewayStatus(disbursement, status, utr ?? null);
  }

  private async executeStudentRefundDisbursement(
    row: PaymentDisbursementEntity,
    adminUserId: number,
  ): Promise<void> {
    const refundRequestId = row.classCancellationRefundRequestId;
    if (refundRequestId == null) {
      throw new BadRequestException('Missing refund request link');
    }

    const request = await this.refundRequestRepo.findOne({
      where: { id: refundRequestId, deleted: false },
      relations: ['student'],
    });
    if (!request) {
      throw new BadRequestException('Refund request not found');
    }
    if (request.aiStatus !== ClassCancellationRefundAiStatusEnum.approved) {
      throw new BadRequestException('Refund request is not AI-approved');
    }

    const claim = await this.claimRepo.findOne({
      where: { cancellationRefundRequestId: refundRequestId, deleted: false },
    });
    if (claim && claim.adminStatus !== PostClassRefundAdminStatusEnum.approved) {
      throw new BadRequestException('Linked post-class claim is not approved');
    }

    row.status = PaymentDisbursementStatusEnum.processing;
    await this.disbursementRepo.save(row);

    try {
      const processed = await this.refundPayoutService.executeClassCancellationRefundPayout(
        refundRequestId,
        adminUserId,
      );
      row.walletTransactionId = processed.walletTransactionId ?? row.walletTransactionId;
      if (processed.payoutStatus === ClassCancellationRefundPayoutStatusEnum.completed) {
        row.status = PaymentDisbursementStatusEnum.completed;
        row.processedAt = processed.processedAt ?? new Date();
      } else if (processed.payoutStatus === ClassCancellationRefundPayoutStatusEnum.processing) {
        row.status = PaymentDisbursementStatusEnum.processing;
        row.processedAt = processed.processedAt ?? new Date();
      } else if (processed.payoutStatus === ClassCancellationRefundPayoutStatusEnum.failed) {
        row.status = PaymentDisbursementStatusEnum.failed;
        row.failureReason = processed.failureReason ?? 'Refund failed';
      }
      await this.disbursementRepo.save(row);
      if (processed.payoutStatus === ClassCancellationRefundPayoutStatusEnum.completed) {
        await this.completionService.onRefundRequestPayoutCompleted(refundRequestId);
      }
    } catch (error) {
      row.status = PaymentDisbursementStatusEnum.failed;
      row.failureReason = error instanceof Error ? error.message : 'Refund failed';
      await this.disbursementRepo.save(row);
      throw error;
    }
  }

  private async executeTutorPayoutDisbursement(
    row: PaymentDisbursementEntity,
    adminUserId: number,
  ): Promise<void> {
    if (row.tutorId == null || !row.periodStartDate || !row.periodEndDate) {
      throw new BadRequestException('Tutor payout period is incomplete');
    }

    const tutor = await this.tutorRepo.findOne({
      where: { id: row.tutorId, deleted: false },
      relations: ['user'],
    });
    if (!tutor?.user) {
      throw new BadRequestException('Tutor not found');
    }

    const bankComplete = await this.userBankDetailsService.isCompleteForUser(tutor.userId);
    if (!bankComplete) {
      throw new BadRequestException('Tutor bank details are incomplete');
    }

    const bank = await this.bankDetailsRepo.findOne({
      where: { userId: tutor.userId, deleted: false },
    });
    if (!bank) {
      throw new BadRequestException('Tutor bank details not found');
    }

    row.status = PaymentDisbursementStatusEnum.processing;
    row.processedByUserId = adminUserId;
    await this.disbursementRepo.save(row);

    try {
      const fundAccountId = await this.razorpayXPayoutGateway.ensureFundAccountForUser(
        tutor.user,
        bank,
      );
      const payout = await this.razorpayXPayoutGateway.createPayout({
        fundAccountId,
        amountInr: row.amountInr,
        referenceId: `disb-${row.id}`,
        narration: `Tutor payout ${row.periodStartDate}`,
      });
      row.gatewayPayoutId = payout.payoutId;
      row.gatewayUtr = payout.utr ?? null;
      row.processedAt = new Date();
      if (payout.status === 'processed') {
        await this.applyTutorPayoutGatewayStatus(row, payout.status, payout.utr ?? null);
      } else {
        await this.disbursementRepo.save(row);
      }
    } catch (error) {
      row.status = PaymentDisbursementStatusEnum.failed;
      row.failureReason = error instanceof Error ? error.message : 'Payout failed';
      await this.disbursementRepo.save(row);
      throw new BadRequestException(row.failureReason);
    }
  }

  private async syncTutorPayoutFromGateway(row: PaymentDisbursementEntity): Promise<void> {
    if (!row.gatewayPayoutId) {
      return;
    }
    const payout = await this.razorpayXPayoutGateway.fetchPayout(row.gatewayPayoutId);
    if (!payout) {
      return;
    }
    await this.applyTutorPayoutGatewayStatus(row, payout.status, payout.utr ?? null);
  }

  private async applyTutorPayoutGatewayStatus(
    row: PaymentDisbursementEntity,
    status: string,
    utr: string | null,
  ): Promise<void> {
    const normalized = status.toLowerCase();
    if (utr) {
      row.gatewayUtr = utr;
    }

    if (normalized === 'processed') {
      row.status = PaymentDisbursementStatusEnum.completed;
      row.processedAt = row.processedAt ?? new Date();
      await this.disbursementRepo.save(row);
      await this.ensureTutorTransferRecord(row);
      return;
    }

    if (normalized === 'failed' || normalized === 'reversed') {
      row.status = PaymentDisbursementStatusEnum.failed;
      row.failureReason = `RazorpayX payout ${normalized}`;
      await this.disbursementRepo.save(row);
      return;
    }

    row.status = PaymentDisbursementStatusEnum.processing;
    await this.disbursementRepo.save(row);
  }

  private async ensureTutorTransferRecord(row: PaymentDisbursementEntity): Promise<void> {
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
    const last4 = bank?.accountNumber?.slice(-4) ?? null;

    await this.transferRepo.save(
      this.transferRepo.create({
        tutorId: row.tutorId,
        periodStartDate: row.periodStartDate,
        periodEndDate: row.periodEndDate,
        amountInr: row.amountInr,
        paidAt: row.processedAt ?? new Date(),
        bankAccountLast4: last4,
        utrReference: row.gatewayUtr ?? null,
        paymentDisbursementId: row.id,
        razorpayPayoutId: row.gatewayPayoutId ?? null,
      }),
    );
  }

  private toListItem(row: PaymentDisbursementEntity): AdminPaymentDisbursementListItem {
    const payeeName =
      personName(row.payeeUser) || row.payeeUser?.email || `User #${row.payeeUserId}`;
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      payeeUserId: row.payeeUserId,
      payeeName,
      amountInr: row.amountInr,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      classCancellationRefundRequestId: row.classCancellationRefundRequestId ?? null,
      tutorId: row.tutorId ?? null,
      periodStartDate: row.periodStartDate ?? null,
      periodEndDate: row.periodEndDate ?? null,
      createdAt: row.createdDate,
      failureReason: row.failureReason ?? null,
    };
  }
}
