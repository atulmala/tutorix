import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  activeClassCountForCancellationRefund,
  allocateRefundAcrossCredits,
  computeClassCancellationRefund,
} from '@tutorix/shared-utils';
import { PaymentAttemptEntity } from '../../commerce/entities/payment-attempt.entity';
import { PaymentAttemptStatusEnum } from '../../commerce/enums/commerce.enums';
import { Student } from '../../student/entities/student.entity';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { allocateGatewayRefund } from '../class-credit-refund-allocation.util';
import {
  orderItemToPaidParts,
  rateCardForOrderItem,
} from '../class-order-item-pricing.util';
import { ClassCancellationRefundRequestEntity } from '../entities/class-cancellation-refund-request.entity';
import { ClassCreditCancellationEntity } from '../entities/class-credit-cancellation.entity';
import { ClassCreditGatewayRefundEntity } from '../entities/class-credit-gateway-refund.entity';
import { StudentClassCreditEntity } from '../entities/student-class-credit.entity';
import { ClassCreditRefundMethodEnum } from '../enums/class-credit-refund-method.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../enums/class-cancellation-refund-payout-status.enum';
import { OrderItemEntity } from '../../commerce/entities/order-item.entity';

export type RefundDeterministicChecks = {
  amountRecomputedMatch: boolean;
  perCreditSumMatch: boolean;
  creditsLinkedToRequest: boolean;
  noDuplicateCompletedPayout: boolean;
  gatewayCapacityOk: boolean;
  recomputedTotalInr: number;
  issues: string[];
};

@Injectable()
export class ClassCancellationRefundChecksService {
  constructor(
    @InjectRepository(ClassCreditCancellationEntity)
    private readonly cancellationRepo: Repository<ClassCreditCancellationEntity>,
    @InjectRepository(StudentClassCreditEntity)
    private readonly creditRepo: Repository<StudentClassCreditEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
    @InjectRepository(PaymentAttemptEntity)
    private readonly paymentAttemptRepo: Repository<PaymentAttemptEntity>,
    @InjectRepository(ClassCreditGatewayRefundEntity)
    private readonly gatewayRefundRepo: Repository<ClassCreditGatewayRefundEntity>,
    @InjectRepository(ClassCancellationRefundRequestEntity)
    private readonly requestRepo: Repository<ClassCancellationRefundRequestEntity>,
    @InjectRepository(TutorOfferingEntity)
    private readonly tutorOfferingRepo: Repository<TutorOfferingEntity>,
    private readonly rateCardService: TutorRateCardService,
  ) {}

  async runDeterministicChecks(
    request: ClassCancellationRefundRequestEntity,
  ): Promise<RefundDeterministicChecks> {
    const issues: string[] = [];
    const cancellations = await this.cancellationRepo.find({
      where: { refundRequestId: request.id, deleted: false },
    });
    const creditIds = cancellations.map((row) => row.creditId);
    const creditsLinkedToRequest =
      creditIds.length === request.classCount && creditIds.length > 0;
    if (!creditsLinkedToRequest) {
      issues.push('Cancellation rows do not match class count on request');
    }

    const perCreditSum = cancellations.reduce((sum, row) => sum + row.amountInr, 0);
    const perCreditSumMatch = perCreditSum === request.amountInr;
    if (!perCreditSumMatch) {
      issues.push(
        `Per-credit amounts sum to ₹${perCreditSum}, request total is ₹${request.amountInr}`,
      );
    }

    const duplicate = await this.requestRepo
      .createQueryBuilder('other')
      .innerJoin(
        ClassCreditCancellationEntity,
        'c',
        'c.refund_request_id = other.id AND c.deleted = false',
      )
      .where('other.id != :id', { id: request.id })
      .andWhere('other.deleted = false')
      .andWhere('other.payout_status = :completed', {
        completed: ClassCancellationRefundPayoutStatusEnum.completed,
      })
      .andWhere('c.credit_id IN (:...creditIds)', { creditIds })
      .getCount();
    const noDuplicateCompletedPayout = duplicate === 0;
    if (!noDuplicateCompletedPayout) {
      issues.push('A credit in this request already has a completed payout');
    }

    let recomputedTotalInr = 0;
    let amountRecomputedMatch = false;
    if (request.orderItemId) {
      const orderItem = await this.orderItemRepo.findOne({
        where: { id: request.orderItemId, deleted: false },
      });
      if (orderItem) {
        const lineCredits = await this.creditRepo.find({
          where: { studentId: request.studentId, orderItemId: request.orderItemId, deleted: false },
        });
        const activeCount = activeClassCountForCancellationRefund(
          lineCredits,
          creditIds,
        );
        const cancelledInRequest = creditIds.length;
        const priorRefundsInr = await this.priorRefundsInrForOrderItem(
          request.orderItemId,
          request.id,
        );
        const pricing = await this.resolvePricing(orderItem, request.tutorOfferingId ?? 0);
        if (pricing) {
          const breakdown = computeClassCancellationRefund({
            parts: orderItemToPaidParts(orderItem),
            mode: pricing.mode,
            rateCard: pricing.rateCard,
            activeCount,
            cancelCount: cancelledInRequest,
            priorRefundsInr,
          });
          recomputedTotalInr = breakdown.refundInr;
          const allocations = allocateRefundAcrossCredits(
            breakdown.refundInr,
            cancelledInRequest,
          );
          amountRecomputedMatch = breakdown.refundInr === request.amountInr;
          if (!amountRecomputedMatch) {
            issues.push(
              `Recomputed refund ₹${breakdown.refundInr} does not match request ₹${request.amountInr}`,
            );
          }
          cancellations.forEach((row, index) => {
            const expected = allocations[index] ?? 0;
            if (row.amountInr !== expected) {
              issues.push(
                `Credit ${row.creditId} amount ₹${row.amountInr} expected ₹${expected}`,
              );
            }
          });
        } else {
          issues.push('Could not resolve pricing for order item');
        }
      } else {
        issues.push('Order item not found');
      }
    }

    let gatewayCapacityOk = true;
    if (request.refundMethod === ClassCreditRefundMethodEnum.gateway) {
      const student = await this.creditRepo.manager.getRepository(Student).findOne({
        where: { id: request.studentId, deleted: false },
      });
      if (student) {
        gatewayCapacityOk = await this.canGatewayCoverAmount(
          student.userId,
          request.amountInr,
        );
        if (!gatewayCapacityOk) {
          issues.push('Payment attempts cannot cover gateway refund amount');
        }
      }
    }

    return {
      amountRecomputedMatch,
      perCreditSumMatch,
      creditsLinkedToRequest,
      noDuplicateCompletedPayout,
      gatewayCapacityOk,
      recomputedTotalInr,
      issues,
    };
  }

  private async priorRefundsInrForOrderItem(
    orderItemId: number,
    excludeRequestId: number,
  ): Promise<number> {
    const row = await this.cancellationRepo
      .createQueryBuilder('cancellation')
      .innerJoin(StudentClassCreditEntity, 'credit', 'credit.id = cancellation.credit_id')
      .where('credit.order_item_id = :orderItemId', { orderItemId })
      .andWhere(
        '(cancellation.refund_request_id IS NULL OR cancellation.refund_request_id != :excludeRequestId)',
        { excludeRequestId },
      )
      .select('COALESCE(SUM(cancellation.amount_inr), 0)', 'total')
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  private async resolvePricing(
    orderItem: OrderItemEntity,
    tutorOfferingId: number,
  ): Promise<{ mode: 'online' | 'offline'; rateCard: import('@tutorix/shared-utils').RateCardLike } | null> {
    const offering = tutorOfferingId
      ? await this.tutorOfferingRepo.findOne({
          where: { id: tutorOfferingId, deleted: false },
        })
      : null;
    const fallbackMap = offering
      ? await this.rateCardService.resolveCompleteRateCards([offering])
      : new Map();
    const fallback = offering ? fallbackMap.get(offering.id) ?? null : null;
    return rateCardForOrderItem(orderItem, fallback);
  }

  async canGatewayCoverAmount(userId: number, amountInr: number): Promise<boolean> {
    const attempts = await this.paymentAttemptRepo
      .createQueryBuilder('attempt')
      .innerJoin('attempt.order', 'order')
      .where('order.user_id = :userId', { userId })
      .andWhere('attempt.status = :status', { status: PaymentAttemptStatusEnum.paid })
      .andWhere('attempt.gateway_payment_id IS NOT NULL')
      .andWhere('attempt.deleted = false')
      .orderBy('attempt.id', 'DESC')
      .getMany();

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
      attempts.map((attempt) => ({
        paymentAttemptId: attempt.id,
        gatewayPaymentId: attempt.gatewayPaymentId ?? '',
        amountInr: attempt.amountInr,
        refundedInr: refundedByAttempt.get(attempt.id) ?? 0,
      })),
    );
    return slices.length > 0;
  }
}
