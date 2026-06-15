import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  CreatePaymentOrderInput,
  PaymentGateway,
  PaymentOrderSession,
  VerifyPaymentInput,
} from '../interfaces/payment-gateway.interface';
import { PaymentGatewayProviderEnum } from '../enums/payment.enums';

@Injectable()
export class RazorpayGateway implements PaymentGateway {
  readonly provider = PaymentGatewayProviderEnum.razorpay;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('RAZORPAY_KEY_ID') &&
        this.configService.get<string>('RAZORPAY_KEY_SECRET'),
    );
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderSession> {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials are not configured');
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amountInr * 100,
        currency: 'INR',
        receipt: input.receipt,
        notes: input.notes ?? {},
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Razorpay order creation failed: ${body}`);
    }

    const order = (await response.json()) as { id: string; amount: number };
    return {
      provider: PaymentGatewayProviderEnum.razorpay,
      orderId: order.id,
      amountInr: input.amountInr,
      currency: 'INR',
      checkoutPayload: {
        key: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: 'INR',
        name: 'Tutorix',
        description: input.notes?.description ?? 'Platform fee',
        prefill: input.customer
          ? {
              name: input.customer.name,
              email: input.customer.email,
              contact: input.customer.phone,
            }
          : undefined,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      return false;
    }
    const payload = `${input.orderId}|${input.paymentId}`;
    const expected = createHmac('sha256', keySecret).update(payload).digest('hex');
    return expected === input.signature;
  }
}

@Injectable()
export class CashfreeGateway implements PaymentGateway {
  readonly provider = PaymentGatewayProviderEnum.cashfree;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('CASHFREE_APP_ID') &&
        this.configService.get<string>('CASHFREE_SECRET_KEY'),
    );
  }

  private getBaseUrl(): string {
    const env = this.configService.get<string>('CASHFREE_ENV') ?? 'sandbox';
    return env === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderSession> {
    const appId = this.configService.get<string>('CASHFREE_APP_ID');
    const secretKey = this.configService.get<string>('CASHFREE_SECRET_KEY');
    if (!appId || !secretKey) {
      throw new Error('Cashfree credentials are not configured');
    }

    const orderId = input.receipt;
    const response = await fetch(`${this.getBaseUrl()}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: input.amountInr,
        order_currency: 'INR',
        customer_details: {
          customer_id: input.customer?.id ?? orderId,
          customer_email: input.customer?.email,
          customer_phone: input.customer?.phone,
          customer_name: input.customer?.name,
        },
        order_note: input.notes?.description,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Cashfree order creation failed: ${body}`);
    }

    const order = (await response.json()) as {
      order_id: string;
      payment_session_id: string;
      order_amount: number;
    };

    return {
      provider: PaymentGatewayProviderEnum.cashfree,
      orderId: order.order_id,
      amountInr: input.amountInr,
      currency: 'INR',
      checkoutPayload: {
        paymentSessionId: order.payment_session_id,
        orderId: order.order_id,
        orderAmount: order.order_amount,
        appId,
        environment:
          this.configService.get<string>('CASHFREE_ENV') ?? 'sandbox',
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
    const appId = this.configService.get<string>('CASHFREE_APP_ID');
    const secretKey = this.configService.get<string>('CASHFREE_SECRET_KEY');
    if (!appId || !secretKey) {
      return false;
    }

    const response = await fetch(
      `${this.getBaseUrl()}/orders/${encodeURIComponent(input.orderId)}/payments/${encodeURIComponent(input.paymentId)}`,
      {
        method: 'GET',
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': '2023-08-01',
        },
      },
    );

    if (!response.ok) {
      return false;
    }

    const payment = (await response.json()) as { payment_status?: string };
    return payment.payment_status === 'SUCCESS';
  }
}
