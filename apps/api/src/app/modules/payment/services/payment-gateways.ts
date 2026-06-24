import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  CreatePaymentOrderInput,
  PaymentGateway,
  PaymentOrderSession,
  VerifyPaymentInput,
} from '../interfaces/payment-gateway.interface';
import { PaymentSettlementDetails } from '../interfaces/payment-settlement.interface';
import { PaymentGatewayProviderEnum } from '../enums/payment.enums';
import {
  buildRazorpayCheckoutDescription,
  buildRazorpayCheckoutDisplayName,
  buildRazorpayOrderLineItems,
  resolveRazorpayCheckoutLogoUrl,
} from '../utils/razorpay-checkout.util';

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
    const checkoutPurpose = buildRazorpayCheckoutDescription(input.notes);
    const checkoutDisplayName = buildRazorpayCheckoutDisplayName(checkoutPurpose);
    const logoUrl =
      resolveRazorpayCheckoutLogoUrl(
        this.configService.get<string>('RAZORPAY_CHECKOUT_LOGO_URL') ||
          process.env.RAZORPAY_CHECKOUT_LOGO_URL,
      );
    const themeColor =
      this.configService.get<string>('RAZORPAY_CHECKOUT_THEME_COLOR') ||
      process.env.RAZORPAY_CHECKOUT_THEME_COLOR ||
      '#5fa8ff';
    const lineItems = buildRazorpayOrderLineItems({
      amountInr: input.amountInr,
      checkoutPurpose,
      notes: input.notes,
      imageUrl: logoUrl,
    });
    const orderNotes = {
      ...(input.notes ?? {}),
      purpose: checkoutPurpose,
    };
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
        description: checkoutPurpose,
        line_items_total: lineItems.line_items_total,
        line_items: lineItems.line_items,
        notes: orderNotes,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Razorpay order creation failed: ${body}`);
    }

    const order = (await response.json()) as {
      id: string;
      amount: number;
      description?: string | null;
      line_items_total?: number;
    };

    const session: PaymentOrderSession = {
      provider: PaymentGatewayProviderEnum.razorpay,
      orderId: order.id,
      amountInr: input.amountInr,
      currency: 'INR',
      checkoutPayload: {
        key: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: 'INR',
        name: checkoutDisplayName,
        description: checkoutPurpose,
        image: logoUrl,
        notes: {
          purpose: checkoutPurpose,
        },
        theme: { color: themeColor },
        prefill: input.customer
          ? {
              name: input.customer.name,
              email: input.customer.email,
              contact: input.customer.phone,
            }
          : undefined,
      },
    };

    return session;
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

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return false;
    }
    const expected = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    return expected === signature;
  }

  private getAuthHeader(): string {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials are not configured');
    }
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
  }

  async fetchSettlementForPayment(
    paymentId: string,
  ): Promise<PaymentSettlementDetails | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
      },
    );

    if (!paymentResponse.ok) {
      const body = await paymentResponse.text();
      throw new Error(`Razorpay payment fetch failed (${paymentResponse.status}): ${body}`);
    }

    const payment = (await paymentResponse.json()) as {
      settlement_id?: string | null;
    };

    const settlementId = payment.settlement_id?.trim();
    if (!settlementId) {
      return null;
    }

    return this.fetchSettlementDetails(settlementId);
  }

  async fetchSettlementDetails(
    settlementId: string,
  ): Promise<PaymentSettlementDetails | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const settlementResponse = await fetch(
      `https://api.razorpay.com/v1/settlements/${encodeURIComponent(settlementId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
      },
    );

    if (settlementResponse.status === 404) {
      return null;
    }

    if (!settlementResponse.ok) {
      const body = await settlementResponse.text();
      throw new Error(
        `Razorpay settlement fetch failed (${settlementResponse.status}): ${body}`,
      );
    }

    const settlement = (await settlementResponse.json()) as {
      id?: string;
      utr?: string | null;
      created_at?: number;
    };

    if (!settlement.id) {
      return null;
    }

    return {
      settlementId: settlement.id,
      utr: settlement.utr?.trim() || undefined,
      settledAt: settlement.created_at
        ? new Date(settlement.created_at * 1000)
        : undefined,
    };
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
