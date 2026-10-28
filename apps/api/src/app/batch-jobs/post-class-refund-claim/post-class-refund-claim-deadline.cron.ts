import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostClassRefundClaimService } from '../../modules/student-cart/services/post-class-refund-claim.service';

@Injectable()
export class PostClassRefundClaimDeadlineCron {
  private readonly logger = new Logger(PostClassRefundClaimDeadlineCron.name);

  constructor(private readonly claimService: PostClassRefundClaimService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async applyDeemedTutorAcceptance(): Promise<void> {
    const count = await this.claimService.applyDeemedTutorAcceptance();
    if (count > 0) {
      this.logger.log(`Marked ${count} post-class refund claim(s) as deemed accepted`);
    }
  }
}
