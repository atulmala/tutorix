import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Request } from 'express';
import { PlatformFeePaymentService } from '../services/platform-fee-payment.service';
import { CashfreeGateway } from '../services/payment-gateways';
import { AdminPaymentProcessingService } from '../../payment-processing/services/admin-payment-processing.service';
import { CashfreePayoutGateway } from '../../payment-processing/services/cashfree-payout.gateway';
import { CashfreeTutorPayoutService } from '../../payment-processing/services/cashfree-tutor-payout.service';
import { ClassCancellationRefundPayoutService } from '../../student-cart/services/class-cancellation-refund-payout.service';

type RawBodyRequest = Request & { body: Buffer };

type CashfreePaymentWebhook = {
  type?: string;
  data?: {
    order?: { order_id?: string };
    payment?: { cf_payment_id?: number | string; payment_status?: string };
    refund?: { refund_id?: string; order_id?: string; refund_status?: string };
  };
};

type CashfreePayoutWebhook = {
  type?: string;
  data?: {
    transfer_id?: string;
    status?: string;
    transfer_utr?: string | null;
  };
};

/** Orders in these states can no longer be paid, so a failed attempt is final. */
const CASHFREE_CLOSED_ORDER_STATUSES = new Set(['EXPIRED', 'TERMINATED', 'TERMINATION_REQUESTED']);

function readRawBody(req: RawBodyRequest): string {
  if (!Buffer.isBuffer(req.body)) {
    throw new BadRequestException('Invalid webhook payload');
  }
  return req.body.toString('utf8');
}

function parseJson<T>(bodyText: string): T {
  try {
    return JSON.parse(bodyText) as T;
  } catch {
    throw new BadRequestException('Invalid webhook JSON');
  }
}

@Controller('webhooks')
export class CashfreeWebhookController {
  private readonly logger = new Logger(CashfreeWebhookController.name);

  constructor(
    private readonly platformFeePaymentService: PlatformFeePaymentService,
    private readonly cashfreeGateway: CashfreeGateway,
    private readonly moduleRef: ModuleRef,
  ) {}

  private get refundPayoutService(): ClassCancellationRefundPayoutService {
    return this.moduleRef.get(ClassCancellationRefundPayoutService, { strict: false });
  }

  private get adminPaymentProcessingService(): AdminPaymentProcessingService {
    return this.moduleRef.get(AdminPaymentProcessingService, { strict: false });
  }

  private get cashfreePayoutGateway(): CashfreePayoutGateway {
    return this.moduleRef.get(CashfreePayoutGateway, { strict: false });
  }

  private get cashfreeTutorPayoutService(): CashfreeTutorPayoutService {
    return this.moduleRef.get(CashfreeTutorPayoutService, { strict: false });
  }

  @Post('cashfree')
  @HttpCode(200)
  async handleCashfreeWebhook(
    @Req() req: RawBodyRequest,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Headers('x-webhook-timestamp') timestamp: string | undefined,
  ): Promise<{ received: true }> {
    const bodyText = readRawBody(req);
    if (!signature || !timestamp) {
      throw new BadRequestException('Missing Cashfree signature');
    }
    if (!this.cashfreeGateway.verifyWebhookSignature(bodyText, timestamp, signature)) {
      throw new BadRequestException('Invalid Cashfree webhook signature');
    }

    const payload = parseJson<CashfreePaymentWebhook>(bodyText);
    const event = payload.type;
    if (!event) {
      return { received: true };
    }

    if (event === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = payload.data?.order?.order_id;
      const paymentId = payload.data?.payment?.cf_payment_id;
      if (orderId && paymentId != null) {
        await this.platformFeePaymentService.fulfillPaymentFromGateway(
          orderId,
          String(paymentId),
        );
      }
      return { received: true };
    }

    if (event === 'PAYMENT_FAILED_WEBHOOK') {
      // A failed attempt is not final while the order is still ACTIVE: the student can retry in the same checkout.
      const orderId = payload.data?.order?.order_id;
      if (orderId) {
        const orderStatus = await this.cashfreeGateway.fetchOrderStatus(orderId);
        if (orderStatus && CASHFREE_CLOSED_ORDER_STATUSES.has(orderStatus)) {
          await this.platformFeePaymentService.markPendingPaymentFailed(orderId);
        }
      }
      return { received: true };
    }

    if (event === 'REFUND_STATUS_WEBHOOK') {
      const refundId = payload.data?.refund?.refund_id;
      if (refundId) {
        const requestId =
          await this.refundPayoutService.findRefundRequestIdForGatewayRefund(refundId);
        if (requestId != null) {
          await this.refundPayoutService.syncGatewayRefundStatus(requestId);
          await this.adminPaymentProcessingService.syncStudentRefundDisbursementFromRequest(
            requestId,
          );
        }
      }
      return { received: true };
    }

    this.logger.debug(`Ignoring Cashfree webhook event: ${event}`);
    return { received: true };
  }

  @Post('cashfree-payouts')
  @HttpCode(200)
  async handleCashfreePayoutWebhook(
    @Req() req: RawBodyRequest,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Headers('x-webhook-timestamp') timestamp: string | undefined,
  ): Promise<{ received: true }> {
    const bodyText = readRawBody(req);
    if (!signature || !timestamp) {
      throw new BadRequestException('Missing Cashfree signature');
    }
    if (!this.cashfreePayoutGateway.verifyWebhookSignature(bodyText, timestamp, signature)) {
      throw new BadRequestException('Invalid Cashfree payout webhook signature');
    }

    const payload = parseJson<CashfreePayoutWebhook>(bodyText);
    const event = payload.type ?? '';
    const transferId = payload.data?.transfer_id;
    if (!event.startsWith('TRANSFER_') || !transferId) {
      this.logger.debug(`Ignoring Cashfree payout webhook event: ${event || 'unknown'}`);
      return { received: true };
    }

    await this.cashfreeTutorPayoutService.handleWebhook(
      transferId,
      payload.data?.status ?? event.replace('TRANSFER_', ''),
      payload.data?.transfer_utr ?? null,
    );
    return { received: true };
  }
}
