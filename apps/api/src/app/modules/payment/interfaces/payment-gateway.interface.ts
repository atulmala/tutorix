import { PaymentGatewayProviderEnum } from '../enums/payment.enums';

export interface CreatePaymentOrderInput {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
  customer?: {
    id: string;
    email?: string;
    phone?: string;
    name?: string;
  };
}

export interface PaymentOrderSession {
  provider: PaymentGatewayProviderEnum;
  orderId: string;
  amountInr: number;
  currency: 'INR';
  checkoutPayload: Record<string, unknown>;
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentGateway {
  readonly provider: PaymentGatewayProviderEnum;
  createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderSession>;
  verifyPayment(input: VerifyPaymentInput): Promise<boolean>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
