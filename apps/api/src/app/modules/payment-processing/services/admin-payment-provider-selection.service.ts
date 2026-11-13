import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PaymentGatewayProviderEnum } from '../../payment/enums/payment.enums';
import { PaymentGatewayFactory } from '../../payment/services/payment-gateway.factory';
import {
  AdminPaymentProviderSelectionResult,
  AdminUpdatePaymentProviderSelectionInput,
} from '../../payment-gateway-fee/dto/admin-payment-provider-selection.dto';
import { TutorPayoutProviderEnum } from '../../payment-gateway-fee/enums/tutor-payout-provider.enum';
import { PaymentProviderSelectionService } from '../../payment-gateway-fee/services/payment-provider-selection.service';
import { CashfreePayoutGateway } from './cashfree-payout.gateway';
import { RazorpayXPayoutGateway } from './razorpayx-payout.gateway';

const PAYMENT_GATEWAY_LABELS: Record<PaymentGatewayProviderEnum, string> = {
  [PaymentGatewayProviderEnum.razorpay]: 'Razorpay',
  [PaymentGatewayProviderEnum.cashfree]: 'Cashfree',
};

const TUTOR_PAYOUT_LABELS: Record<TutorPayoutProviderEnum, string> = {
  [TutorPayoutProviderEnum.razorpayx]: 'RazorpayX',
  [TutorPayoutProviderEnum.cashfree]: 'Cashfree Payouts',
};

@Injectable()
export class AdminPaymentProviderSelectionService {
  private readonly logger = new Logger(AdminPaymentProviderSelectionService.name);

  constructor(
    private readonly providerSelection: PaymentProviderSelectionService,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
    private readonly razorpayXPayoutGateway: RazorpayXPayoutGateway,
    private readonly cashfreePayoutGateway: CashfreePayoutGateway,
  ) {}

  async getSelection(): Promise<AdminPaymentProviderSelectionResult> {
    const selection = await this.providerSelection.getSelection();
    return {
      activePaymentGateway: selection.paymentGateway,
      tutorPayoutProvider: selection.tutorPayoutProvider,
      paymentGatewayOptions: Object.values(PaymentGatewayProviderEnum).map((provider) => ({
        provider,
        label: PAYMENT_GATEWAY_LABELS[provider],
        configured: this.paymentGatewayFactory.isProviderConfigured(provider),
      })),
      tutorPayoutOptions: Object.values(TutorPayoutProviderEnum).map((provider) => ({
        provider,
        label: TUTOR_PAYOUT_LABELS[provider],
        configured: this.isPayoutProviderConfigured(provider),
      })),
    };
  }

  async updateSelection(
    input: AdminUpdatePaymentProviderSelectionInput,
    adminUserId: number,
  ): Promise<AdminPaymentProviderSelectionResult> {
    const current = await this.providerSelection.getSelection();
    if (
      input.activePaymentGateway &&
      input.activePaymentGateway !== current.paymentGateway &&
      !this.paymentGatewayFactory.isProviderConfigured(input.activePaymentGateway)
    ) {
      throw new BadRequestException(
        `${PAYMENT_GATEWAY_LABELS[input.activePaymentGateway]} credentials are not configured on the server`,
      );
    }
    if (
      input.tutorPayoutProvider &&
      input.tutorPayoutProvider !== current.tutorPayoutProvider &&
      !this.isPayoutProviderConfigured(input.tutorPayoutProvider)
    ) {
      throw new BadRequestException(
        `${TUTOR_PAYOUT_LABELS[input.tutorPayoutProvider]} is not configured on the server`,
      );
    }

    const updated = await this.providerSelection.updateSelection({
      paymentGateway: input.activePaymentGateway,
      tutorPayoutProvider: input.tutorPayoutProvider,
    });
    this.logger.log(
      `Admin ${adminUserId} set payment providers: gateway ${current.paymentGateway} -> ${updated.paymentGateway}, ` +
        `tutor payouts ${current.tutorPayoutProvider} -> ${updated.tutorPayoutProvider}`,
    );
    return this.getSelection();
  }

  private isPayoutProviderConfigured(provider: TutorPayoutProviderEnum): boolean {
    return provider === TutorPayoutProviderEnum.cashfree
      ? this.cashfreePayoutGateway.isConfigured()
      : this.razorpayXPayoutGateway.isEnabled();
  }
}
