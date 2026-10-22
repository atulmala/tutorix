import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassCancellationRefundRequestEntity } from '../entities/class-cancellation-refund-request.entity';
import { ClassCreditCancellationEntity } from '../entities/class-credit-cancellation.entity';
import { ClassCancellationRefundAiStatusEnum } from '../enums/class-cancellation-refund-ai-status.enum';
import { ClassCancellationRefundInitiatedByEnum } from '../enums/class-cancellation-refund-initiated-by.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../enums/class-cancellation-refund-payout-status.enum';
import { ClassCreditRefundMethodEnum } from '../enums/class-credit-refund-method.enum';

export type RefundBreakdownSnapshot = {
  breakdownText?: string;
  lines?: string[];
  perCreditAmounts?: Array<{ creditId: number; amountInr: number }>;
  orderItemId?: number;
  activeCount?: number;
  cancelCount?: number;
  priorRefundsInr?: number;
  refundInr?: number;
};

export type CreateRefundRequestParams = {
  initiatedBy: ClassCancellationRefundInitiatedByEnum;
  studentId: number;
  tutorId?: number | null;
  tutorOfferingId?: number | null;
  orderItemId?: number | null;
  orderId?: number | null;
  classCount: number;
  amountInr: number;
  refundMethod: ClassCreditRefundMethodEnum;
  initiatedByUserId: number;
  creditIds: number[];
  refundBreakdown: RefundBreakdownSnapshot;
};

@Injectable()
export class ClassCancellationRefundRequestService {
  constructor(
    @InjectRepository(ClassCancellationRefundRequestEntity)
    private readonly requestRepo: Repository<ClassCancellationRefundRequestEntity>,
    @InjectRepository(ClassCreditCancellationEntity)
    private readonly cancellationRepo: Repository<ClassCreditCancellationEntity>,
  ) {}

  async createRequest(
    params: CreateRefundRequestParams,
  ): Promise<ClassCancellationRefundRequestEntity | null> {
    if (params.amountInr <= 0) {
      return null;
    }

    const request = await this.requestRepo.save(
      this.requestRepo.create({
        initiatedBy: params.initiatedBy,
        studentId: params.studentId,
        tutorId: params.tutorId ?? null,
        tutorOfferingId: params.tutorOfferingId ?? null,
        orderItemId: params.orderItemId ?? null,
        orderId: params.orderId ?? null,
        classCount: params.classCount,
        amountInr: params.amountInr,
        refundMethod: params.refundMethod,
        payoutStatus: ClassCancellationRefundPayoutStatusEnum.pending,
        refundBreakdownJson: params.refundBreakdown as Record<string, unknown>,
        initiatedAt: new Date(),
        initiatedByUserId: params.initiatedByUserId,
        aiStatus: ClassCancellationRefundAiStatusEnum.pending,
      }),
    );

    if (params.creditIds.length > 0) {
      await this.cancellationRepo
        .createQueryBuilder()
        .update(ClassCreditCancellationEntity)
        .set({ refundRequestId: request.id })
        .where('credit_id IN (:...ids)', { ids: params.creditIds })
        .execute();
    }

    return request;
  }

  async findById(id: number): Promise<ClassCancellationRefundRequestEntity | null> {
    return this.requestRepo.findOne({
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
  }
}
