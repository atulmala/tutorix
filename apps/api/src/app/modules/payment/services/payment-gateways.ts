import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
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

/** Local dev only: skip live Razorpay refund API (netbanking partial refunds often fail in test). */
export const SIMULATED_GATEWAY_REFUND_PREFIX = 'rfnd_sim_';

/** Razorpay returns 400 (not 404) when a payment/settlement id is unknown to this key. */
function isRazorpayUnknownIdResponse(status: number, body: string): boolean {
  if (status === 404) {
    return true;
  }
  if (status !== 400) {
    return false;
  }
  return /does not exist/i.test(body);
}

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

  private isGatewayRefundSimulated(): boolean {
    const env =
      this.configService.get<string>('TUTORIX_ENV') ||
      process.env.TUTORIX_ENV ||
      '';
    if (env !== 'development') {
      return false;
    }
    const flag =
      this.configService.get<string>('CLASS_CANCELLATION_GATEWAY_REFUND_SIMULATE') ||
      process.env.CLASS_CANCELLATION_GATEWAY_REFUND_SIMULATE ||
      '';
    return flag.toLowerCase() === 'true';
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

  async fetchCapturedPaymentForOrder(
    orderId: string,
  ): Promise<{ orderId: string; paymentId: string } | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const response = await fetch(
      `https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}/payments`,
      {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Razorpay order payments fetch failed (${response.status}): ${body}`,
      );
    }

    const data = (await response.json()) as {
      items?: Array<{ id?: string; status?: string }>;
    };

    const captured = data.items?.find((item) => item.status === 'captured');
    if (!captured?.id) {
      return null;
    }

    return {
      orderId,
      paymentId: captured.id,
    };
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

  async fetchPaymentRefundContext(paymentId: string): Promise<{
    id: string;
    status: string;
    amountPaise: number;
    amountRefundedPaise: number;
    refundablePaise: number;
    method: string;
  } | null> {
    if (!this.isConfigured()) {
      return null;
    }
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        method: 'GET',
        headers: { Authorization: this.getAuthHeader() },
      },
    );
    if (!response.ok) {
      const body = await response.text();
      if (isRazorpayUnknownIdResponse(response.status, body)) {
        return null;
      }
      throw new Error(`Razorpay payment fetch failed (${response.status}): ${body}`);
    }
    const payment = (await response.json()) as {
      id?: string;
      status?: string;
      amount?: number;
      amount_refunded?: number;
      method?: string;
    };
    const amountPaise = payment.amount ?? 0;
    const amountRefundedPaise = payment.amount_refunded ?? 0;
    return {
      id: payment.id ?? paymentId,
      status: payment.status ?? 'unknown',
      amountPaise,
      amountRefundedPaise,
      refundablePaise: Math.max(0, amountPaise - amountRefundedPaise),
      method: payment.method ?? 'unknown',
    };
  }

  async refundPayment(
    paymentId: string,
    amountInr: number,
    options?: { receipt?: string },
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Razorpay credentials are not configured');
    }
    if (amountInr < 1) {
      throw new Error('Refund amount must be at least ₹1');
    }
    const amountPaise = Math.round(amountInr * 100);

    if (this.isGatewayRefundSimulated()) {
      return `${SIMULATED_GATEWAY_REFUND_PREFIX}${paymentId}_${amountPaise}`;
    }

    const paymentContext = await this.fetchPaymentRefundContext(paymentId);
    const isPartial =
      paymentContext != null && amountPaise < paymentContext.refundablePaise;

    if (paymentContext && paymentContext.status !== 'captured') {
      throw new Error(
        `Razorpay payment is not captured (status=${paymentContext.status})`,
      );
    }
    if (paymentContext && amountPaise > paymentContext.refundablePaise) {
      throw new Error(
        `Refund ₹${amountInr} exceeds Razorpay refundable balance (₹${paymentContext.refundablePaise / 100})`,
      );
    }

    const baseBody: Record<string, unknown> = { amount: amountPaise };
    if (options?.receipt) {
      baseBody.receipt = options.receipt.slice(0, 40);
    }

    const strategies: Array<{
      endpoint: 'payment' | 'refunds';
      body: Record<string, unknown>;
    }> = [
      { endpoint: 'payment', body: { ...baseBody } },
      { endpoint: 'payment', body: { ...baseBody, speed: 'optimum' } },
      { endpoint: 'payment', body: { ...baseBody, speed: 'normal' } },
      { endpoint: 'refunds', body: { ...baseBody, payment_id: paymentId } },
    ];

    let lastError = '';
    for (const strategy of strategies) {
      const url =
        strategy.endpoint === 'payment'
          ? `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`
          : 'https://api.razorpay.com/v1/refunds';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strategy.body),
      });
      if (response.ok) {
        const payload = (await response.json()) as { id?: string };
        if (!payload.id) {
          throw new Error('Razorpay refund did not return an id');
        }
        return payload.id;
      }
      lastError = await response.text();
    }

    const methodHint = paymentContext?.method ?? 'unknown';
    const partialHint =
      isPartial && methodHint === 'netbanking'
        ? ' Partial refunds on netbanking may be blocked in test mode or when the Razorpay refund balance is low—try wallet payout or a full refund from the Razorpay dashboard.'
        : ' Ensure the Razorpay account has sufficient refund balance.';
    throw new Error(
      `Razorpay refund failed (${methodHint}): ${lastError}.${partialHint}`,
    );
  }

  async fetchRefundStatus(refundId: string): Promise<string | null> {
    if (refundId.startsWith(SIMULATED_GATEWAY_REFUND_PREFIX)) {
      return 'processed';
    }
    if (!this.isConfigured()) {
      return null;
    }
    const response = await fetch(
      `https://api.razorpay.com/v1/refunds/${encodeURIComponent(refundId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
      },
    );
    if (!response.ok) {
      const body = await response.text();
      if (isRazorpayUnknownIdResponse(response.status, body)) {
        return null;
      }
      throw new Error(`Razorpay refund fetch failed (${response.status}): ${body}`);
    }
    const payload = (await response.json()) as { status?: string };
    return payload.status ?? null;
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
      if (isRazorpayUnknownIdResponse(paymentResponse.status, body)) {
        return null;
      }
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
      if (isRazorpayUnknownIdResponse(settlementResponse.status, body)) {
        return null;
      }
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

const CASHFREE_PG_API_VERSION = '2023-08-01';
const CASHFREE_ORDER_ID_MAX_LENGTH = 45;
const CASHFREE_REFUND_ID_MAX_LENGTH = 40;

/** Merchant refund ids we send to Cashfree; used to tell Cashfree refunds apart from Razorpay ones. */
export const CASHFREE_REFUND_ID_PREFIX = 'cfr-';

export type CashfreeRefundStatus = 'processed' | 'pending' | 'failed';

export function isCashfreeRefundId(refundId: string): boolean {
  return refundId.startsWith(CASHFREE_REFUND_ID_PREFIX);
}

export function buildCashfreeOrderId(receipt: string, now: number = Date.now()): string {
  const suffix = `_${now.toString(36)}`;
  const base =
    receipt.replace(/[^A-Za-z0-9_-]/g, '').slice(0, CASHFREE_ORDER_ID_MAX_LENGTH - suffix.length) ||
    'ord';
  return `${base}${suffix}`;
}

export function buildCashfreeRefundId(
  refundRequestId: number,
  paymentAttemptId: number,
  now: number = Date.now(),
): string {
  return `${CASHFREE_REFUND_ID_PREFIX}${refundRequestId}-${paymentAttemptId}-${now.toString(36)}`.slice(
    0,
    CASHFREE_REFUND_ID_MAX_LENGTH,
  );
}

export function normalizeCashfreeRefundStatus(
  status: string | null | undefined,
): CashfreeRefundStatus | null {
  switch ((status ?? '').toUpperCase()) {
    case 'SUCCESS':
      return 'processed';
    case 'PENDING':
    case 'ONHOLD':
      return 'pending';
    case 'CANCELLED':
    case 'FAILED':
      return 'failed';
    default:
      return null;
  }
}

function cashfreeCustomerPhone(phone: string | undefined): string | undefined {
  const digits = phone?.replace(/\D/g, '') ?? '';
  return digits.length >= 10 ? digits.slice(-10) : undefined;
}

/** Cashfree rejects order_tags values containing non-ASCII characters (e.g. `·`). */
export function cashfreeTagValue(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
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

  getEnvironment(): 'sandbox' | 'production' {
    return this.configService.get<string>('CASHFREE_ENV') === 'production'
      ? 'production'
      : 'sandbox';
  }

  private getBaseUrl(): string {
    return this.getEnvironment() === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }

  private getHeaders(withJsonBody = false): Record<string, string> {
    const appId = this.configService.get<string>('CASHFREE_APP_ID');
    const secretKey = this.configService.get<string>('CASHFREE_SECRET_KEY');
    if (!appId || !secretKey) {
      throw new Error('Cashfree credentials are not configured');
    }
    return {
      'x-client-id': appId,
      'x-client-secret': secretKey,
      'x-api-version': CASHFREE_PG_API_VERSION,
      ...(withJsonBody ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  private isGatewayRefundSimulated(): boolean {
    const env =
      this.configService.get<string>('TUTORIX_ENV') ||
      process.env.TUTORIX_ENV ||
      '';
    if (env !== 'development') {
      return false;
    }
    const flag =
      this.configService.get<string>('CLASS_CANCELLATION_GATEWAY_REFUND_SIMULATE') ||
      process.env.CLASS_CANCELLATION_GATEWAY_REFUND_SIMULATE ||
      '';
    return flag.toLowerCase() === 'true';
  }

  private getWebhookNotifyUrl(): string | undefined {
    const base = (
      this.configService.get<string>('API_PUBLIC_BASE_URL') ||
      process.env.API_PUBLIC_BASE_URL ||
      ''
    )
      .trim()
      .replace(/\/+$/, '');
    if (!base.startsWith('https://')) {
      return undefined;
    }
    return `${base}/api/webhooks/cashfree`;
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderSession> {
    const headers = this.getHeaders(true);
    const customerPhone = cashfreeCustomerPhone(input.customer?.phone);
    if (!customerPhone) {
      throw new Error(
        'A 10-digit mobile number is required on your profile to pay with Cashfree',
      );
    }

    const orderId = buildCashfreeOrderId(input.receipt);
    const notifyUrl = this.getWebhookNotifyUrl();
    const returnUrl = (
      this.configService.get<string>('CASHFREE_RETURN_URL') ||
      process.env.CASHFREE_RETURN_URL ||
      ''
    ).trim();
    const orderTags: Record<string, string> = Object.fromEntries(
      Object.entries(input.notes ?? {})
        .filter(([, value]) => typeof value === 'string' && value.length > 0)
        .slice(0, 10)
        .map(([key, value]): [string, string] => [key.slice(0, 64), cashfreeTagValue(value).slice(0, 255)])
        .filter(([, value]) => value.length > 0),
    );

    const response = await fetch(`${this.getBaseUrl()}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        order_id: orderId,
        order_amount: input.amountInr,
        order_currency: 'INR',
        customer_details: {
          customer_id: `u_${(input.customer?.id ?? orderId).replace(/[^A-Za-z0-9_-]/g, '')}`,
          customer_email: input.customer?.email,
          customer_phone: customerPhone,
          customer_name: input.customer?.name,
        },
        order_meta: {
          ...(notifyUrl ? { notify_url: notifyUrl } : {}),
          ...(returnUrl
            ? { return_url: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}order_id={order_id}` }
            : {}),
        },
        order_note: input.notes?.description?.slice(0, 200),
        ...(Object.keys(orderTags).length > 0 ? { order_tags: orderTags } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Cashfree order creation failed (${response.status}): ${body}`);
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
        environment: this.getEnvironment(),
      },
    };
  }

  /** Cashfree has no client-side signature; trust only a server-side order lookup. */
  async verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }
    const captured = await this.fetchCapturedPaymentForOrder(input.orderId);
    return captured != null;
  }

  async fetchCapturedPaymentForOrder(
    orderId: string,
  ): Promise<{ orderId: string; paymentId: string } | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const orderResponse = await fetch(
      `${this.getBaseUrl()}/orders/${encodeURIComponent(orderId)}`,
      { method: 'GET', headers: this.getHeaders() },
    );
    if (orderResponse.status === 404) {
      return null;
    }
    if (!orderResponse.ok) {
      const body = await orderResponse.text();
      throw new Error(`Cashfree order fetch failed (${orderResponse.status}): ${body}`);
    }
    const order = (await orderResponse.json()) as {
      order_status?: string;
      order_amount?: number;
    };
    if (order.order_status !== 'PAID') {
      return null;
    }

    const paymentsResponse = await fetch(
      `${this.getBaseUrl()}/orders/${encodeURIComponent(orderId)}/payments`,
      { method: 'GET', headers: this.getHeaders() },
    );
    if (!paymentsResponse.ok) {
      const body = await paymentsResponse.text();
      throw new Error(
        `Cashfree order payments fetch failed (${paymentsResponse.status}): ${body}`,
      );
    }
    const payments = (await paymentsResponse.json()) as Array<{
      cf_payment_id?: number | string;
      payment_status?: string;
      payment_amount?: number;
    }>;
    const success = (Array.isArray(payments) ? payments : []).find(
      (payment) => payment.payment_status === 'SUCCESS',
    );
    if (success?.cf_payment_id == null) {
      return null;
    }
    if (
      order.order_amount != null &&
      success.payment_amount != null &&
      Math.round(success.payment_amount * 100) < Math.round(order.order_amount * 100)
    ) {
      return null;
    }

    return { orderId, paymentId: String(success.cf_payment_id) };
  }

  async fetchOrderStatus(orderId: string): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }
    const response = await fetch(
      `${this.getBaseUrl()}/orders/${encodeURIComponent(orderId)}`,
      { method: 'GET', headers: this.getHeaders() },
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Cashfree order fetch failed (${response.status}): ${body}`);
    }
    const order = (await response.json()) as { order_status?: string };
    return order.order_status ?? null;
  }

  async refundPayment(input: {
    gatewayOrderId: string;
    amountInr: number;
    refundId: string;
    note?: string;
  }): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Cashfree credentials are not configured');
    }
    if (input.amountInr < 1) {
      throw new Error('Refund amount must be at least ₹1');
    }

    if (this.isGatewayRefundSimulated()) {
      return `${SIMULATED_GATEWAY_REFUND_PREFIX}${input.refundId}`;
    }

    const response = await fetch(
      `${this.getBaseUrl()}/orders/${encodeURIComponent(input.gatewayOrderId)}/refunds`,
      {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({
          refund_amount: input.amountInr,
          refund_id: input.refundId,
          ...(input.note ? { refund_note: input.note.slice(0, 100) } : {}),
        }),
      },
    );
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Cashfree refund failed (${response.status}): ${body}`);
    }
    const payload = (await response.json()) as { refund_id?: string };
    return payload.refund_id ?? input.refundId;
  }

  async fetchRefundStatus(
    gatewayOrderId: string,
    refundId: string,
  ): Promise<CashfreeRefundStatus | null> {
    if (refundId.startsWith(SIMULATED_GATEWAY_REFUND_PREFIX)) {
      return 'processed';
    }
    if (!this.isConfigured()) {
      return null;
    }
    const response = await fetch(
      `${this.getBaseUrl()}/orders/${encodeURIComponent(gatewayOrderId)}/refunds/${encodeURIComponent(refundId)}`,
      { method: 'GET', headers: this.getHeaders() },
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Cashfree refund fetch failed (${response.status}): ${body}`);
    }
    const payload = (await response.json()) as { refund_status?: string };
    return normalizeCashfreeRefundStatus(payload.refund_status);
  }

  async fetchSettlementForOrder(
    gatewayOrderId: string,
  ): Promise<PaymentSettlementDetails | null> {
    if (!this.isConfigured()) {
      return null;
    }
    const response = await fetch(
      `${this.getBaseUrl()}/orders/${encodeURIComponent(gatewayOrderId)}/settlements`,
      { method: 'GET', headers: this.getHeaders() },
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Cashfree settlement fetch failed (${response.status}): ${body}`);
    }
    const settlement = (await response.json()) as {
      cf_settlement_id?: number | string | null;
      transfer_utr?: string | null;
      transfer_time?: string | null;
    };
    if (settlement.cf_settlement_id == null) {
      return null;
    }
    return {
      settlementId: String(settlement.cf_settlement_id),
      utr: settlement.transfer_utr?.trim() || undefined,
      settledAt: settlement.transfer_time ? new Date(settlement.transfer_time) : undefined,
    };
  }

  verifyWebhookSignature(rawBody: string, timestamp: string, signature: string): boolean {
    const secretKey = this.configService.get<string>('CASHFREE_SECRET_KEY');
    if (!secretKey) {
      return false;
    }
    const expected = createHmac('sha256', secretKey)
      .update(`${timestamp}${rawBody}`)
      .digest('base64');
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);
    return (
      expectedBuffer.length === signatureBuffer.length &&
      timingSafeEqual(expectedBuffer, signatureBuffer)
    );
  }
}
