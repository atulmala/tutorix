import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { constants, createHash, createHmac, publicEncrypt, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { UserBankDetailsEntity } from '../../user-bank-details/entities/user-bank-details.entity';

const CASHFREE_PAYOUT_API_VERSION = '2024-01-01';
const CASHFREE_TRANSFER_ID_MAX_LENGTH = 40;

export const TUTOR_PAYOUT_PROVIDER_CASHFREE = 'cashfree';

export type CashfreePayoutStatus = 'processed' | 'processing' | 'failed' | 'reversed';

export type CashfreePayoutResult = {
  transferId: string;
  status: CashfreePayoutStatus;
  rawStatus: string;
  utr?: string | null;
  statusDescription?: string | null;
};

type CashfreeTransferResponse = {
  transfer_id?: string;
  cf_transfer_id?: string;
  status?: string;
  status_description?: string | null;
  transfer_utr?: string | null;
};

export function normalizeCashfreeTransferStatus(status: string | null | undefined): CashfreePayoutStatus {
  switch ((status ?? '').toUpperCase()) {
    case 'SUCCESS':
      return 'processed';
    case 'FAILED':
    case 'REJECTED':
      return 'failed';
    case 'REVERSED':
      return 'reversed';
    default:
      return 'processing';
  }
}

export function buildCashfreeTransferId(disbursementId: number, now: number = Date.now()): string {
  return `disb-${disbursementId}-${now.toString(36)}`.slice(0, CASHFREE_TRANSFER_ID_MAX_LENGTH);
}

/** Stable per bank account, so a changed account gets a new Cashfree beneficiary. */
export function buildCashfreeBeneficiaryId(userId: number, bank: { accountNumber: string; ifscCode: string }): string {
  const fingerprint = createHash('sha256')
    .update(`${bank.accountNumber.trim()}|${bank.ifscCode.trim().toUpperCase()}`)
    .digest('hex')
    .slice(0, 10);
  return `tutorix-${userId}-${fingerprint}`;
}

@Injectable()
export class CashfreePayoutGateway {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserBankDetailsEntity)
    private readonly bankDetailsRepo: Repository<UserBankDetailsEntity>,
  ) {}

  /** Tutor payouts go through Cashfree only when TUTOR_PAYOUT_PROVIDER=cashfree. */
  isSelected(): boolean {
    const provider =
      this.configService.get<string>('TUTOR_PAYOUT_PROVIDER') ||
      process.env.TUTOR_PAYOUT_PROVIDER ||
      '';
    return provider.trim().toLowerCase() === TUTOR_PAYOUT_PROVIDER_CASHFREE;
  }

  isConfigured(): boolean {
    return Boolean(this.getClientId() && this.getClientSecret());
  }

  private getClientId(): string {
    return (
      this.configService.get<string>('CASHFREE_PAYOUT_CLIENT_ID') ||
      process.env.CASHFREE_PAYOUT_CLIENT_ID ||
      ''
    ).trim();
  }

  private getClientSecret(): string {
    return (
      this.configService.get<string>('CASHFREE_PAYOUT_CLIENT_SECRET') ||
      process.env.CASHFREE_PAYOUT_CLIENT_SECRET ||
      ''
    ).trim();
  }

  private getBaseUrl(): string {
    const env = this.configService.get<string>('CASHFREE_ENV') || process.env.CASHFREE_ENV;
    return env === 'production'
      ? 'https://api.cashfree.com/payout'
      : 'https://sandbox.cashfree.com/payout';
  }

  private buildSignature(clientId: string): string | null {
    const publicKey = (
      this.configService.get<string>('CASHFREE_PAYOUT_PUBLIC_KEY') ||
      process.env.CASHFREE_PAYOUT_PUBLIC_KEY ||
      ''
    )
      .replace(/\\n/g, '\n')
      .trim();
    if (!publicKey) {
      return null;
    }
    const payload = `${clientId}.${Math.floor(Date.now() / 1000)}`;
    return publicEncrypt(
      { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING },
      Buffer.from(payload),
    ).toString('base64');
  }

  private getHeaders(withJsonBody = false): Record<string, string> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    if (!clientId || !clientSecret) {
      throw new Error('Cashfree payout credentials are not configured');
    }
    const signature = this.buildSignature(clientId);
    return {
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
      'x-api-version': CASHFREE_PAYOUT_API_VERSION,
      ...(signature ? { 'x-cf-signature': signature } : {}),
      ...(withJsonBody ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  async ensureBeneficiaryForUser(user: User, bank: UserBankDetailsEntity): Promise<string> {
    const beneficiaryId = buildCashfreeBeneficiaryId(user.id, bank);
    if (bank.cashfreeBeneficiaryId === beneficiaryId) {
      return beneficiaryId;
    }

    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email ||
      'Account holder';
    const phone = user.mobile?.replace(/\D/g, '').slice(-10);
    const response = await fetch(`${this.getBaseUrl()}/beneficiary`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        beneficiary_id: beneficiaryId,
        beneficiary_name: name.slice(0, 100),
        beneficiary_instrument_details: {
          bank_account_number: bank.accountNumber.trim(),
          bank_ifsc: bank.ifscCode.trim().toUpperCase(),
        },
        beneficiary_contact_details: {
          ...(user.email ? { beneficiary_email: user.email } : {}),
          ...(phone && phone.length === 10
            ? { beneficiary_phone: phone, beneficiary_country_code: '+91' }
            : {}),
        },
      }),
    });

    // 409: beneficiary already exists for this id (same account), which is fine to reuse.
    if (!response.ok && response.status !== 409) {
      const body = await response.text();
      throw new Error(`Cashfree beneficiary creation failed (${response.status}): ${body}`);
    }

    bank.cashfreeBeneficiaryId = beneficiaryId;
    await this.bankDetailsRepo.save(bank);
    return beneficiaryId;
  }

  async createTransfer(input: {
    beneficiaryId: string;
    amountInr: number;
    transferId: string;
    remarks: string;
  }): Promise<CashfreePayoutResult> {
    const response = await fetch(`${this.getBaseUrl()}/transfers`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        transfer_id: input.transferId,
        transfer_amount: input.amountInr,
        transfer_currency: 'INR',
        transfer_mode: 'imps',
        beneficiary_details: { beneficiary_id: input.beneficiaryId },
        transfer_remarks: input.remarks.replace(/[^A-Za-z0-9 ]/g, ' ').slice(0, 70),
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Cashfree payout failed (${response.status}): ${body}`);
    }
    return this.toResult((await response.json()) as CashfreeTransferResponse, input.transferId);
  }

  async fetchTransfer(transferId: string): Promise<CashfreePayoutResult | null> {
    if (!this.isConfigured()) {
      return null;
    }
    const response = await fetch(
      `${this.getBaseUrl()}/transfers?transfer_id=${encodeURIComponent(transferId)}`,
      { method: 'GET', headers: this.getHeaders() },
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Cashfree payout fetch failed (${response.status}): ${body}`);
    }
    return this.toResult((await response.json()) as CashfreeTransferResponse, transferId);
  }

  /** Payouts webhooks are signed with the payout client secret: base64 HMAC-SHA256 of timestamp + raw body. */
  verifyWebhookSignature(rawBody: string, timestamp: string, signature: string): boolean {
    const secret = this.getClientSecret();
    if (!secret) {
      return false;
    }
    const expected = Buffer.from(
      createHmac('sha256', secret).update(`${timestamp}${rawBody}`).digest('base64'),
    );
    const received = Buffer.from(signature);
    return expected.length === received.length && timingSafeEqual(expected, received);
  }

  private toResult(payload: CashfreeTransferResponse, fallbackTransferId: string): CashfreePayoutResult {
    const rawStatus = payload.status ?? 'RECEIVED';
    return {
      transferId: payload.transfer_id ?? fallbackTransferId,
      status: normalizeCashfreeTransferStatus(rawStatus),
      rawStatus,
      utr: payload.transfer_utr ?? null,
      statusDescription: payload.status_description ?? null,
    };
  }
}
