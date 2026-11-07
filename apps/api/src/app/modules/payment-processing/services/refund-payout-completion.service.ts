import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostClassRefundClaimEntity } from '../../student-cart/entities/post-class-refund-claim.entity';
import { ClassCancellationRefundRequestEntity } from '../../student-cart/entities/class-cancellation-refund-request.entity';
import { ClassCancellationRefundPayoutStatusEnum } from '../../student-cart/enums/class-cancellation-refund-payout-status.enum';

@Injectable()
export class RefundPayoutCompletionService {
  private readonly logger = new Logger(RefundPayoutCompletionService.name);

  constructor(
    @InjectRepository(PostClassRefundClaimEntity)
    private readonly claimRepo: Repository<PostClassRefundClaimEntity>,
    @InjectRepository(ClassCancellationRefundRequestEntity)
    private readonly refundRequestRepo: Repository<ClassCancellationRefundRequestEntity>,
  ) {}

  async onRefundRequestPayoutCompleted(refundRequestId: number): Promise<void> {
    const request = await this.refundRequestRepo.findOne({
      where: { id: refundRequestId, deleted: false },
    });
    if (request?.payoutStatus !== ClassCancellationRefundPayoutStatusEnum.completed) {
      return;
    }

    const claims = await this.claimRepo.find({
      where: {
        cancellationRefundRequestId: refundRequestId,
        deleted: false,
      },
    });
    for (const claim of claims) {
      if (claim.fulfilledAt != null) {
        continue;
      }
      claim.fulfilledAt = new Date();
      await this.claimRepo.save(claim);
    }
  }
}
