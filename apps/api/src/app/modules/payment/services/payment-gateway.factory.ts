import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';
import { PaymentGatewayProviderEnum } from '../enums/payment.enums';
import { PaymentProviderSelectionService } from '../../payment-gateway-fee/services/payment-provider-selection.service';
import { CashfreeGateway, RazorpayGateway } from './payment-gateways';

@Injectable()
export class NoOpPaymentGateway implements PaymentGateway {
  readonly provider = PaymentGatewayProviderEnum.razorpay;

  async createOrder(): Promise<never> {
    throw new BadRequestException(
      'The payment gateway selected in admin is not configured. Add its credentials or choose another gateway.',
    );
  }

  async verifyPayment(): Promise<never> {
    throw new BadRequestException('Payment gateway is not configured.');
  }
}

@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly noOpGateway: NoOpPaymentGateway,
    private readonly razorpayGateway: RazorpayGateway,
    private readonly cashfreeGateway: CashfreeGateway,
    private readonly providerSelection: PaymentProviderSelectionService,
  ) {}

  /** Gateway for new orders, as selected in admin (Fees & Charges). */
  async getActiveGateway(): Promise<PaymentGateway> {
    const { paymentGateway } = await this.providerSelection.getSelection();
    return this.getGatewayForProvider(paymentGateway);
  }

  /** Gateway an existing order was created with, regardless of the current admin selection. */
  getGatewayForProvider(provider: PaymentGatewayProviderEnum | null | undefined): PaymentGateway {
    const gateway =
      provider === PaymentGatewayProviderEnum.cashfree ? this.cashfreeGateway : this.razorpayGateway;
    return gateway.isConfigured() ? gateway : this.noOpGateway;
  }

  isProviderConfigured(provider: PaymentGatewayProviderEnum): boolean {
    return provider === PaymentGatewayProviderEnum.cashfree
      ? this.cashfreeGateway.isConfigured()
      : this.razorpayGateway.isConfigured();
  }

  getCashfreeGateway(): CashfreeGateway {
    return this.cashfreeGateway;
  }
}
