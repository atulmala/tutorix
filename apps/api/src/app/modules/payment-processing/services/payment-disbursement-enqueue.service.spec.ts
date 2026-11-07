import { PaymentDisbursementEnqueueService } from './payment-disbursement-enqueue.service';
import { ClassCancellationRefundAiStatusEnum } from '../../student-cart/enums/class-cancellation-refund-ai-status.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../../student-cart/enums/class-cancellation-refund-payout-status.enum';
import { ClassCreditRefundMethodEnum } from '../../student-cart/enums/class-credit-refund-method.enum';
import { PaymentDisbursementKindEnum } from '../enums/payment-disbursement-kind.enum';
import { PaymentDisbursementStatusEnum } from '../enums/payment-disbursement-status.enum';

describe('PaymentDisbursementEnqueueService', () => {
  it('creates a ready wallet disbursement when refund is AI-approved', async () => {
    const saved: unknown[] = [];
    const disbursementRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        saved.push(value);
        return { ...value, id: 1 };
      }),
    };
    const refundRequestRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 10,
        amountInr: 500,
        refundMethod: ClassCreditRefundMethodEnum.wallet,
        aiStatus: ClassCancellationRefundAiStatusEnum.approved,
        payoutStatus: ClassCancellationRefundPayoutStatusEnum.pending,
        student: { userId: 42 },
      }),
    };

    const service = new PaymentDisbursementEnqueueService(
      disbursementRepo as never,
      refundRequestRepo as never,
    );

    await service.syncForRefundRequest(10);

    expect(disbursementRepo.save).toHaveBeenCalled();
    expect(saved[0]).toMatchObject({
      kind: PaymentDisbursementKindEnum.student_refund_wallet,
      status: PaymentDisbursementStatusEnum.ready,
      payeeUserId: 42,
      amountInr: 500,
      classCancellationRefundRequestId: 10,
    });
  });
});
