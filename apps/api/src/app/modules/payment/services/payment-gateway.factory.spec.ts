import { PaymentGatewayProviderEnum } from '../enums/payment.enums';
import { TutorPayoutProviderEnum } from '../../payment-gateway-fee/enums/tutor-payout-provider.enum';
import { PaymentProviderSelectionService } from '../../payment-gateway-fee/services/payment-provider-selection.service';
import { NoOpPaymentGateway, PaymentGatewayFactory } from './payment-gateway.factory';
import { CashfreeGateway, RazorpayGateway } from './payment-gateways';

describe('PaymentGatewayFactory', () => {
  const noOp = new NoOpPaymentGateway();
  const razorpay = {
    provider: PaymentGatewayProviderEnum.razorpay,
    isConfigured: jest.fn(() => true),
  };
  const cashfree = {
    provider: PaymentGatewayProviderEnum.cashfree,
    isConfigured: jest.fn(() => true),
  };
  const selection = {
    paymentGateway: PaymentGatewayProviderEnum.razorpay,
    tutorPayoutProvider: TutorPayoutProviderEnum.razorpayx,
  };
  const providerSelection = { getSelection: jest.fn(async () => selection) };

  let factory: PaymentGatewayFactory;

  beforeEach(() => {
    razorpay.isConfigured.mockReturnValue(true);
    cashfree.isConfigured.mockReturnValue(true);
    selection.paymentGateway = PaymentGatewayProviderEnum.razorpay;
    factory = new PaymentGatewayFactory(
      noOp,
      razorpay as unknown as RazorpayGateway,
      cashfree as unknown as CashfreeGateway,
      providerSelection as unknown as PaymentProviderSelectionService,
    );
  });

  it('returns the gateway selected in admin', async () => {
    await expect(factory.getActiveGateway()).resolves.toBe(razorpay);
    selection.paymentGateway = PaymentGatewayProviderEnum.cashfree;
    await expect(factory.getActiveGateway()).resolves.toBe(cashfree);
  });

  it('does not fall back to another gateway when the selected one is not configured', async () => {
    selection.paymentGateway = PaymentGatewayProviderEnum.cashfree;
    cashfree.isConfigured.mockReturnValue(false);
    await expect(factory.getActiveGateway()).resolves.toBe(noOp);
  });

  it('resolves an existing order to its own provider regardless of the selection', () => {
    selection.paymentGateway = PaymentGatewayProviderEnum.cashfree;
    expect(factory.getGatewayForProvider(PaymentGatewayProviderEnum.razorpay)).toBe(razorpay);
    expect(factory.getGatewayForProvider(PaymentGatewayProviderEnum.cashfree)).toBe(cashfree);
    expect(factory.getGatewayForProvider(undefined)).toBe(razorpay);
  });
});
