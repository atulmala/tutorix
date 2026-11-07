import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { UserBankDetailsEntity } from '../../user-bank-details/entities/user-bank-details.entity';

export type RazorpayXPayoutResult = {
  payoutId: string;
  status: string;
  utr?: string | null;
};

@Injectable()
export class RazorpayXPayoutGateway {
  private readonly logger = new Logger(RazorpayXPayoutGateway.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserBankDetailsEntity)
    private readonly bankDetailsRepo: Repository<UserBankDetailsEntity>,
  ) {}

  isEnabled(): boolean {
    const flag =
      this.configService.get<string>('TUTOR_PAYOUT_RAZORPAYX_ENABLED') ||
      process.env.TUTOR_PAYOUT_RAZORPAYX_ENABLED ||
      '';
    return flag.toLowerCase() === 'true';
  }

  private getAuthHeader(): string {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials are not configured');
    }
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
  }

  private getAccountNumber(): string {
    const account =
      this.configService.get<string>('RAZORPAYX_ACCOUNT_NUMBER') ||
      process.env.RAZORPAYX_ACCOUNT_NUMBER ||
      '';
    if (!account.trim()) {
      throw new Error('RAZORPAYX_ACCOUNT_NUMBER is not configured');
    }
    return account.trim();
  }

  async ensureFundAccountForUser(user: User, bank: UserBankDetailsEntity): Promise<string> {
    if (bank.razorpayFundAccountId?.trim()) {
      return bank.razorpayFundAccountId.trim();
    }

    let contactId = bank.razorpayContactId?.trim();
    if (!contactId) {
      contactId = await this.createContact(user);
      bank.razorpayContactId = contactId;
      await this.bankDetailsRepo.save(bank);
    }

    const fundAccountId = await this.createFundAccount(contactId, bank, user);
    bank.razorpayFundAccountId = fundAccountId;
    await this.bankDetailsRepo.save(bank);
    return fundAccountId;
  }

  async createPayout(input: {
    fundAccountId: string;
    amountInr: number;
    referenceId: string;
    narration: string;
  }): Promise<RazorpayXPayoutResult> {
    if (!this.isEnabled()) {
      throw new Error(
        'Tutor RazorpayX payouts are disabled. Set TUTOR_PAYOUT_RAZORPAYX_ENABLED=true after RazorpayX is configured.',
      );
    }

    const amountPaise = Math.round(input.amountInr * 100);
    const purpose =
      this.configService.get<string>('RAZORPAYX_PAYOUT_PURPOSE') ||
      process.env.RAZORPAYX_PAYOUT_PURPOSE ||
      'payout';

    const response = await fetch('https://api.razorpay.com/v1/payouts', {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_number: this.getAccountNumber(),
        fund_account_id: input.fundAccountId,
        amount: amountPaise,
        currency: 'INR',
        mode: 'IMPS',
        purpose,
        queue_if_low_balance: true,
        reference_id: input.referenceId.slice(0, 40),
        narration: input.narration.slice(0, 30),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`RazorpayX payout failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as {
      id?: string;
      status?: string;
      utr?: string | null;
    };
    if (!payload.id) {
      throw new Error('RazorpayX payout did not return an id');
    }
    return {
      payoutId: payload.id,
      status: payload.status ?? 'processing',
      utr: payload.utr ?? null,
    };
  }

  async fetchPayout(payoutId: string): Promise<RazorpayXPayoutResult | null> {
    if (!this.isEnabled()) {
      return null;
    }
    const response = await fetch(
      `https://api.razorpay.com/v1/payouts/${encodeURIComponent(payoutId)}`,
      {
        method: 'GET',
        headers: { Authorization: this.getAuthHeader() },
      },
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`RazorpayX payout fetch failed (${response.status}): ${body}`);
    }
    const payload = (await response.json()) as {
      id?: string;
      status?: string;
      utr?: string | null;
    };
    if (!payload.id) {
      return null;
    }
    return {
      payoutId: payload.id,
      status: payload.status ?? 'unknown',
      utr: payload.utr ?? null,
    };
  }

  private async createContact(user: User): Promise<string> {
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email ||
      `User ${user.id}`;
    const response = await fetch('https://api.razorpay.com/v1/contacts', {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.slice(0, 50),
        email: user.email ?? undefined,
        contact: user.mobileNumber?.replace(/\D/g, '').slice(-10) || undefined,
        type: 'vendor',
        reference_id: `user-${user.id}`,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`RazorpayX contact creation failed (${response.status}): ${body}`);
    }
    const payload = (await response.json()) as { id?: string };
    if (!payload.id) {
      throw new Error('RazorpayX contact did not return an id');
    }
    return payload.id;
  }

  private async createFundAccount(
    contactId: string,
    bank: UserBankDetailsEntity,
    user: User,
  ): Promise<string> {
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email ||
      'Account holder';
    const response = await fetch('https://api.razorpay.com/v1/fund_accounts', {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact_id: contactId,
        account_type: 'bank_account',
        bank_account: {
          name: name.slice(0, 120),
          ifsc: bank.ifscCode,
          account_number: bank.accountNumber,
        },
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`RazorpayX fund account creation failed (${response.status}): ${body}`);
    }
    const payload = (await response.json()) as { id?: string };
    if (!payload.id) {
      throw new Error('RazorpayX fund account did not return an id');
    }
    return payload.id;
  }
}
