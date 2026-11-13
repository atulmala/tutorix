import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { UserBankDetailsEntity } from '../../user-bank-details/entities/user-bank-details.entity';
import {
  buildCashfreeBeneficiaryId,
  buildCashfreeTransferId,
  CashfreePayoutGateway,
  normalizeCashfreeTransferStatus,
} from './cashfree-payout.gateway';
import { PaymentGatewayProviderEnum } from '../../payment/enums/payment.enums';
import { TutorPayoutProviderEnum } from '../../payment-gateway-fee/enums/tutor-payout-provider.enum';
import { PaymentProviderSelectionService } from '../../payment-gateway-fee/services/payment-provider-selection.service';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe('CashfreePayoutGateway', () => {
  const config: Record<string, string | undefined> = {
    CASHFREE_PAYOUT_CLIENT_ID: 'cf_payout_id',
    CASHFREE_PAYOUT_CLIENT_SECRET: 'cf_payout_secret',
    CASHFREE_ENV: 'sandbox',
  };
  const configService = {
    get: jest.fn((key: string) => config[key]),
  } as unknown as ConfigService;
  const bankRepo = { save: jest.fn(async (row) => row) };
  const user = { id: 7, firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', mobile: '9876543210' } as User;

  let gateway: CashfreePayoutGateway;
  let fetchMock: jest.Mock;

  const selection = {
    paymentGateway: PaymentGatewayProviderEnum.razorpay,
    tutorPayoutProvider: TutorPayoutProviderEnum.razorpayx,
  };
  const providerSelection = { getSelection: jest.fn(async () => selection) };

  beforeEach(() => {
    jest.clearAllMocks();
    selection.tutorPayoutProvider = TutorPayoutProviderEnum.razorpayx;
    gateway = new CashfreePayoutGateway(
      configService,
      bankRepo as unknown as Repository<UserBankDetailsEntity>,
      providerSelection as unknown as PaymentProviderSelectionService,
    );
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('is only selected when Cashfree is the payout provider chosen in admin', async () => {
    await expect(gateway.isSelected()).resolves.toBe(false);
    selection.tutorPayoutProvider = TutorPayoutProviderEnum.cashfree;
    await expect(gateway.isSelected()).resolves.toBe(true);
  });

  it('creates a beneficiary once per bank account and stores its id', async () => {
    const bank = { accountNumber: '1234567890', ifscCode: 'hdfc0001234' } as UserBankDetailsEntity;
    fetchMock.mockResolvedValueOnce(jsonResponse({ beneficiary_id: 'x' }, 201));

    const beneficiaryId = await gateway.ensureBeneficiaryForUser(user, bank);

    expect(beneficiaryId).toBe(buildCashfreeBeneficiaryId(7, bank));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://sandbox.cashfree.com/payout/beneficiary');
    expect(init.headers['x-api-version']).toBe('2024-01-01');
    const body = JSON.parse(init.body as string);
    expect(body.beneficiary_instrument_details).toEqual({
      bank_account_number: '1234567890',
      bank_ifsc: 'HDFC0001234',
    });
    expect(bank.cashfreeBeneficiaryId).toBe(beneficiaryId);
    expect(bankRepo.save).toHaveBeenCalledWith(bank);

    await gateway.ensureBeneficiaryForUser(user, bank);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats an existing beneficiary (409) as reusable', async () => {
    const bank = { accountNumber: '1111', ifscCode: 'SBIN0000001' } as UserBankDetailsEntity;
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'exists' }, 409));
    await expect(gateway.ensureBeneficiaryForUser(user, bank)).resolves.toMatch(/^tutorix-7-/);
  });

  it('gives a changed bank account a new beneficiary id', () => {
    const a = buildCashfreeBeneficiaryId(7, { accountNumber: '1111', ifscCode: 'SBIN0000001' });
    const b = buildCashfreeBeneficiaryId(7, { accountNumber: '2222', ifscCode: 'SBIN0000001' });
    expect(a).not.toBe(b);
  });

  it('creates an IMPS transfer and maps its status', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ transfer_id: 'disb-5-abc', status: 'RECEIVED' }),
    );

    const result = await gateway.createTransfer({
      beneficiaryId: 'tutorix-7-abc',
      amountInr: 1200,
      transferId: 'disb-5-abc',
      remarks: 'Tutor payout 2026-11-01',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual(
      expect.objectContaining({
        transfer_id: 'disb-5-abc',
        transfer_amount: 1200,
        transfer_mode: 'imps',
        beneficiary_details: { beneficiary_id: 'tutorix-7-abc' },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ transferId: 'disb-5-abc', status: 'processing' }),
    );
  });

  it('fetches a transfer by transfer_id', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ transfer_id: 'disb-5-abc', status: 'SUCCESS', transfer_utr: 'UTR9' }),
    );
    await expect(gateway.fetchTransfer('disb-5-abc')).resolves.toEqual(
      expect.objectContaining({ status: 'processed', utr: 'UTR9' }),
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://sandbox.cashfree.com/payout/transfers?transfer_id=disb-5-abc',
    );
  });

  it('verifies payout webhook signatures with the payout client secret', () => {
    const rawBody = '{"type":"TRANSFER_SUCCESS"}';
    const signature = createHmac('sha256', 'cf_payout_secret')
      .update(`1731150000${rawBody}`)
      .digest('base64');
    expect(gateway.verifyWebhookSignature(rawBody, '1731150000', signature)).toBe(true);
    expect(gateway.verifyWebhookSignature(rawBody, '1731150001', signature)).toBe(false);
  });
});

describe('Cashfree payout helpers', () => {
  it('maps transfer statuses', () => {
    expect(normalizeCashfreeTransferStatus('SUCCESS')).toBe('processed');
    expect(normalizeCashfreeTransferStatus('REJECTED')).toBe('failed');
    expect(normalizeCashfreeTransferStatus('REVERSED')).toBe('reversed');
    expect(normalizeCashfreeTransferStatus('PENDING')).toBe('processing');
  });

  it('builds bounded transfer ids', () => {
    expect(buildCashfreeTransferId(5, 0)).toBe('disb-5-0');
  });
});
