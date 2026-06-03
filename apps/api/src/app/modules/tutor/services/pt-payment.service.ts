import { BadRequestException, Injectable } from '@nestjs/common';
import { isPtFeeCollectionEnabled } from '../../../config/pt-fee.config';

export interface PtPaymentOrderResult {
  orderId: string;
  amountInr: number;
}

/**
 * Swap this implementation when integrating Razorpay or another gateway.
 */
export interface PtPaymentGateway {
  createOrder(tutorOfferingId: number, amountInr: number): Promise<PtPaymentOrderResult>;
  confirmPayment(gatewayOrderId: string): Promise<boolean>;
}

@Injectable()
export class NoOpPtPaymentService implements PtPaymentGateway {
  async createOrder(): Promise<PtPaymentOrderResult> {
    if (!isPtFeeCollectionEnabled()) {
      throw new BadRequestException(
        'Proficiency test fee payment is not required at this time.',
      );
    }
    throw new BadRequestException('Payment gateway is not configured yet.');
  }

  async confirmPayment(): Promise<boolean> {
    throw new BadRequestException('Payment gateway is not configured yet.');
  }
}
