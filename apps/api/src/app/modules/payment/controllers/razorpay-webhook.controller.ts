import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PlatformFeePaymentService } from '../services/platform-fee-payment.service';
import { RazorpayGateway } from '../services/payment-gateways';

type RawBodyRequest = Request & { body: Buffer };

@Controller('webhooks')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly platformFeePaymentService: PlatformFeePaymentService,
    private readonly razorpayGateway: RazorpayGateway,
  ) {}

  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Req() req: RawBodyRequest,
    @Headers('x-razorpay-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      throw new BadRequestException('Invalid webhook payload');
    }
    if (!signature) {
      throw new BadRequestException('Missing Razorpay signature');
    }

    const bodyText = rawBody.toString('utf8');
    if (!this.razorpayGateway.verifyWebhookSignature(bodyText, signature)) {
      throw new BadRequestException('Invalid Razorpay webhook signature');
    }

    let payload: {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string } };
        order?: { entity?: { id?: string } };
      };
    };
    try {
      payload = JSON.parse(bodyText) as typeof payload;
    } catch {
      throw new BadRequestException('Invalid webhook JSON');
    }

    const event = payload.event;
    if (!event) {
      return { received: true };
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;
      const orderId = paymentEntity?.order_id ?? orderEntity?.id;
      const paymentId = paymentEntity?.id;
      if (orderId && paymentId) {
        await this.platformFeePaymentService.fulfillPaymentFromGateway(
          orderId,
          paymentId,
        );
      }
      return { received: true };
    }

    if (event === 'payment.failed') {
      const orderId = payload.payload?.payment?.entity?.order_id;
      if (orderId) {
        await this.platformFeePaymentService.markPendingPaymentFailed(orderId);
      }
      return { received: true };
    }

    this.logger.debug(`Ignoring Razorpay webhook event: ${event}`);
    return { received: true };
  }
}
