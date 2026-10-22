import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RazorpayGateway,
  SIMULATED_GATEWAY_REFUND_PREFIX,
} from '../../payment/services/payment-gateways';
import { personDisplayName } from '../admin-class-booking.utils';
import { AdminClassCancellationGatewayRefund } from '../dto/admin/admin-class-cancellation-gateway-refund.dto';
import { AdminClassCancellationRefundDetail } from '../dto/admin/admin-class-cancellation-refund-detail.dto';
import { AdminClassCancellationRefundListInput } from '../dto/admin/admin-class-cancellation-refund-list.input';
import { AdminClassCancellationRefundListItem } from '../dto/admin/admin-class-cancellation-refund-list-item.dto';
import { AdminClassCancellationRefundListResult } from '../dto/admin/admin-class-cancellation-refund-list-result.dto';
import { ClassCancellationRefundRequestEntity } from '../entities/class-cancellation-refund-request.entity';
import { ClassCreditCancellationEntity } from '../entities/class-credit-cancellation.entity';
import { ClassCreditGatewayRefundEntity } from '../entities/class-credit-gateway-refund.entity';

@Injectable()
export class AdminClassCancellationRefundService {
  constructor(
    @InjectRepository(ClassCancellationRefundRequestEntity)
    private readonly requestRepo: Repository<ClassCancellationRefundRequestEntity>,
    @InjectRepository(ClassCreditCancellationEntity)
    private readonly cancellationRepo: Repository<ClassCreditCancellationEntity>,
    @InjectRepository(ClassCreditGatewayRefundEntity)
    private readonly gatewayRefundRepo: Repository<ClassCreditGatewayRefundEntity>,
    private readonly razorpayGateway: RazorpayGateway,
  ) {}

  async list(
    input: AdminClassCancellationRefundListInput,
  ): Promise<AdminClassCancellationRefundListResult> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;

    const qb = this.requestRepo
      .createQueryBuilder('req')
      .leftJoin('req.student', 'student')
      .leftJoin('student.user', 'studentUser')
      .leftJoin('req.tutor', 'tutor')
      .leftJoin('tutor.user', 'tutorUser')
      .leftJoin('req.tutorOffering', 'tutorOffering')
      .leftJoin('tutorOffering.offering', 'offering')
      .where('req.deleted = false')
      .andWhere('req.initiatedBy = :initiatedBy', { initiatedBy: input.initiatedBy });

    if (input.payoutStatus) {
      qb.andWhere('req.payoutStatus = :payoutStatus', {
        payoutStatus: input.payoutStatus,
      });
    }
    if (input.aiStatus) {
      qb.andWhere('req.aiStatus = :aiStatus', { aiStatus: input.aiStatus });
    }
    if (input.studentSearch?.trim()) {
      const term = `%${input.studentSearch.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(studentUser.firstName) LIKE :term OR LOWER(studentUser.lastName) LIKE :term OR LOWER(studentUser.email) LIKE :term)`,
        { term },
      );
    }
    if (input.tutorSearch?.trim()) {
      const term = `%${input.tutorSearch.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(tutorUser.firstName) LIKE :term OR LOWER(tutorUser.lastName) LIKE :term OR LOWER(tutorUser.email) LIKE :term)`,
        { term },
      );
    }

    const total = await qb.getCount();
    const rows = await qb
      .orderBy('req.initiatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const ids = rows.map((row) => row.id);
    const withRelations =
      ids.length > 0
        ? await this.requestRepo.find({
            where: ids.map((id) => ({ id, deleted: false })),
            relations: [
              'student',
              'student.user',
              'tutor',
              'tutor.user',
              'tutorOffering',
              'tutorOffering.offering',
            ],
          })
        : [];
    const byId = new Map(withRelations.map((row) => [row.id, row]));

    const items: AdminClassCancellationRefundListItem[] = rows.map((row) => {
      const full = byId.get(row.id) ?? row;
      return this.toListItem(full);
    });

    return { items, total, page, pageSize };
  }

  async getDetail(id: number): Promise<AdminClassCancellationRefundDetail> {
    const request = await this.requestRepo.findOne({
      where: { id, deleted: false },
      relations: [
        'student',
        'student.user',
        'tutor',
        'tutor.user',
        'tutorOffering',
        'tutorOffering.offering',
      ],
    });
    if (!request) {
      throw new NotFoundException('Refund request not found');
    }
    const cancellations = await this.cancellationRepo.find({
      where: { refundRequestId: id, deleted: false },
    });
    const breakdown = request.refundBreakdownJson as { breakdownText?: string } | null;
    const gatewayRefundRows = await this.gatewayRefundRepo.find({
      where: { refundRequestId: id, deleted: false },
      order: { id: 'ASC' },
    });
    const gatewayRefunds = await this.buildGatewayRefundDtos(gatewayRefundRows);
    const gatewayPayoutNote = this.gatewayPayoutNoteFor(gatewayRefunds);
    return {
      id: request.id,
      initiatedBy: request.initiatedBy,
      studentId: request.studentId,
      studentName:
        personDisplayName(
          request.student?.user?.firstName,
          request.student?.user?.lastName,
        ) || 'Student',
      tutorId: request.tutorId,
      tutorName:
        personDisplayName(
          request.tutor?.user?.firstName,
          request.tutor?.user?.lastName,
        ) || '—',
      offeringLabel: request.tutorOffering?.offering?.displayName ?? 'Class',
      classCount: request.classCount,
      amountInr: request.amountInr,
      refundMethod: request.refundMethod,
      payoutStatus: request.payoutStatus,
      aiStatus: request.aiStatus,
      aiRejectionReason: request.aiRejectionReason,
      aiSummary: request.aiSummary,
      aiConfidence: request.aiConfidence,
      breakdownText: breakdown?.breakdownText ?? null,
      aiChecksJson: request.aiChecksJson
        ? JSON.stringify(request.aiChecksJson)
        : null,
      creditIds: cancellations.map((row) => row.creditId),
      orderId: request.orderId,
      orderItemId: request.orderItemId,
      failureReason: request.failureReason,
      initiatedAt: request.initiatedAt,
      processedAt: request.processedAt,
      walletTransactionId: request.walletTransactionId,
      gatewayRefunds,
      gatewayPayoutNote,
    };
  }

  private async buildGatewayRefundDtos(
    rows: ClassCreditGatewayRefundEntity[],
  ): Promise<AdminClassCancellationGatewayRefund[]> {
    return Promise.all(
      rows.map(async (row) => {
        const simulated = row.gatewayRefundId.startsWith(
          SIMULATED_GATEWAY_REFUND_PREFIX,
        );
        let razorpayRefundStatus: string | null = null;
        if (!simulated) {
          try {
            razorpayRefundStatus = await this.razorpayGateway.fetchRefundStatus(
              row.gatewayRefundId,
            );
          } catch {
            razorpayRefundStatus = null;
          }
        }
        return {
          id: row.id,
          paymentAttemptId: row.paymentAttemptId,
          gatewayPaymentId: row.gatewayPaymentId,
          gatewayRefundId: row.gatewayRefundId,
          amountInr: row.amountInr,
          simulated,
          razorpayRefundStatus,
        };
      }),
    );
  }

  private gatewayPayoutNoteFor(
    gatewayRefunds: AdminClassCancellationGatewayRefund[],
  ): string | null {
    if (gatewayRefunds.length === 0) {
      return null;
    }
    if (gatewayRefunds.some((row) => row.simulated)) {
      return 'CLASS_CANCELLATION_GATEWAY_REFUND_SIMULATE is enabled — gateway refunds exist only in Tutorix, not on the Razorpay dashboard.';
    }
    return 'Use the payment and refund IDs below in the Razorpay dashboard (test vs live must match API keys).';
  }

  private toListItem(
    request: ClassCancellationRefundRequestEntity,
  ): AdminClassCancellationRefundListItem {
    return {
      id: request.id,
      initiatedBy: request.initiatedBy,
      studentId: request.studentId,
      studentName:
        personDisplayName(
          request.student?.user?.firstName,
          request.student?.user?.lastName,
        ) || 'Student',
      tutorId: request.tutorId,
      tutorName:
        personDisplayName(
          request.tutor?.user?.firstName,
          request.tutor?.user?.lastName,
        ) || '—',
      offeringLabel: request.tutorOffering?.offering?.displayName ?? 'Class',
      classCount: request.classCount,
      amountInr: request.amountInr,
      refundMethod: request.refundMethod,
      payoutStatus: request.payoutStatus,
      aiStatus: request.aiStatus,
      aiRejectionReason: request.aiRejectionReason,
      aiSummary: request.aiSummary,
      initiatedAt: request.initiatedAt,
      orderId: request.orderId,
    };
  }
}
