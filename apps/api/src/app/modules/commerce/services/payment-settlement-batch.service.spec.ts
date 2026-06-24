import { Repository } from 'typeorm';
import { BatchJobRunService } from '../../../batch-jobs/services/batch-job-run.service';
import { PaymentGatewayProviderEnum } from '../../payment/enums/payment.enums';
import { RazorpayGateway } from '../../payment/services/payment-gateways';
import { PaymentAttemptEntity } from '../entities/payment-attempt.entity';
import { PaymentAttemptStatusEnum } from '../enums/commerce.enums';
import { PaymentSettlementBatchService } from './payment-settlement-batch.service';

describe('PaymentSettlementBatchService', () => {
  let service: PaymentSettlementBatchService;
  let paymentAttemptRepo: {
    createQueryBuilder: jest.Mock;
    save: jest.Mock;
  };
  let razorpayGateway: {
    isConfigured: jest.Mock;
    fetchSettlementForPayment: jest.Mock;
    fetchSettlementDetails: jest.Mock;
  };
  let batchJobRunService: {
    startRun: jest.Mock;
    finishRun: jest.Mock;
  };

  beforeEach(() => {
    paymentAttemptRepo = {
      save: jest.fn(async (entity) => entity),
      createQueryBuilder: jest.fn(),
    };
    razorpayGateway = {
      isConfigured: jest.fn().mockReturnValue(true),
      fetchSettlementForPayment: jest.fn(),
      fetchSettlementDetails: jest.fn(),
    };
    batchJobRunService = {
      startRun: jest.fn().mockResolvedValue({ id: 1 }),
      finishRun: jest.fn().mockResolvedValue(undefined),
    };

    service = new PaymentSettlementBatchService(
      {
        get: jest.fn((key: string) => {
          if (key === 'PAYMENT_SETTLEMENT_BATCH_LIMIT') {
            return '10';
          }
          return undefined;
        }),
      } as never,
      razorpayGateway as unknown as RazorpayGateway,
      batchJobRunService as unknown as BatchJobRunService,
      paymentAttemptRepo as unknown as Repository<PaymentAttemptEntity>,
    );
  });

  it('marks attempt updated when Razorpay returns settlement details', async () => {
    const attempt = {
      id: 5,
      gatewayPaymentId: 'pay_test123',
      provider: PaymentGatewayProviderEnum.razorpay,
      status: PaymentAttemptStatusEnum.paid,
    } as PaymentAttemptEntity;

    razorpayGateway.fetchSettlementForPayment.mockResolvedValue({
      settlementId: 'setl_T4b8Orc7WakwZa',
      utr: 'AXISCN1382521510',
      settledAt: new Date('2026-06-22T08:00:00Z'),
    });

    const outcome = await service.syncAttemptSettlement(attempt);

    expect(outcome).toBe('updated');
    expect(attempt.gatewaySettlementId).toBe('setl_T4b8Orc7WakwZa');
    expect(attempt.settlementUtr).toBe('AXISCN1382521510');
    expect(attempt.settledAt).toEqual(new Date('2026-06-22T08:00:00Z'));
    expect(paymentAttemptRepo.save).toHaveBeenCalledWith(attempt);
  });

  it('returns pending when payment is not settled yet', async () => {
    const attempt = {
      id: 6,
      gatewayPaymentId: 'pay_pending',
      status: PaymentAttemptStatusEnum.paid,
    } as PaymentAttemptEntity;

    razorpayGateway.fetchSettlementForPayment.mockResolvedValue(null);

    const outcome = await service.syncAttemptSettlement(attempt);

    expect(outcome).toBe('pending');
    expect(paymentAttemptRepo.save).not.toHaveBeenCalled();
  });

  it('refreshes UTR when settlement id exists but UTR is missing', async () => {
    const attempt = {
      id: 7,
      gatewayPaymentId: 'pay_test456',
      gatewaySettlementId: 'setl_existing',
      status: PaymentAttemptStatusEnum.paid,
    } as PaymentAttemptEntity;

    razorpayGateway.fetchSettlementDetails.mockResolvedValue({
      settlementId: 'setl_existing',
      utr: 'AXISCN9999999999',
      settledAt: new Date('2026-06-22T09:00:00Z'),
    });

    const outcome = await service.syncAttemptSettlement(attempt);

    expect(outcome).toBe('updated');
    expect(razorpayGateway.fetchSettlementDetails).toHaveBeenCalledWith('setl_existing');
    expect(attempt.settlementUtr).toBe('AXISCN9999999999');
  });
});
