import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';
import { PaymentGatewayProviderEnum } from '../enums/payment.enums';
import { CashfreeGateway, RazorpayGateway } from './payment-gateways';

@Injectable()
export class NoOpPaymentGateway implements PaymentGateway {
  readonly provider = PaymentGatewayProviderEnum.razorpay;

  async createOrder(): Promise<never> {
    throw new BadRequestException(
      'Payment gateway is not configured. Set PAYMENT_GATEWAY and provider credentials.',
    );
  }

  async verifyPayment(): Promise<never> {
    throw new BadRequestException('Payment gateway is not configured.');
  }
}

@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly noOpGateway: NoOpPaymentGateway,
    private readonly razorpayGateway: RazorpayGateway,
    private readonly cashfreeGateway: CashfreeGateway,
  ) {}

  getActiveGateway(): PaymentGateway {
    const provider = this.configService.get<string>('PAYMENT_GATEWAY');
    if (provider === PaymentGatewayProviderEnum.cashfree) {
      if (this.cashfreeGateway.isConfigured()) {
        return this.cashfreeGateway;
      }
    }
    if (provider === PaymentGatewayProviderEnum.razorpay || !provider) {
      if (this.razorpayGateway.isConfigured()) {
        return this.razorpayGateway;
      }
    }
    if (this.cashfreeGateway.isConfigured()) {
      return this.cashfreeGateway;
    }
    if (this.razorpayGateway.isConfigured()) {
      return this.razorpayGateway;
    }
    return this.noOpGateway;
  }
}
