import { PostClassRefundAdminStatusEnum } from '../enums/post-class-refund-admin-status.enum';
import { PostClassRefundClaimEntity } from '../entities/post-class-refund-claim.entity';
import { PostClassRefundClaimStudentStatusEnum } from '../enums/post-class-refund-claim-student-status.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../enums/class-cancellation-refund-payout-status.enum';
import { PostClassRefundClaimService } from './post-class-refund-claim.service';

describe('PostClassRefundClaimService.toStudentDisplayStatus', () => {
  const service = Object.create(PostClassRefundClaimService.prototype) as PostClassRefundClaimService;

  function claim(partial: Partial<PostClassRefundClaimEntity>): PostClassRefundClaimEntity {
    return partial as PostClassRefundClaimEntity;
  }

  it('maps pending admin review to under_process', () => {
    expect(
      service.toStudentDisplayStatus(
        claim({ adminStatus: PostClassRefundAdminStatusEnum.pending }),
      ),
    ).toBe(PostClassRefundClaimStudentStatusEnum.under_process);
  });

  it('maps admin rejection to rejected', () => {
    expect(
      service.toStudentDisplayStatus(
        claim({ adminStatus: PostClassRefundAdminStatusEnum.rejected }),
      ),
    ).toBe(PostClassRefundClaimStudentStatusEnum.rejected);
  });

  it('maps approved without fulfillment to approved', () => {
    expect(
      service.toStudentDisplayStatus(
        claim({
          adminStatus: PostClassRefundAdminStatusEnum.approved,
          fulfilledAt: null,
        }),
      ),
    ).toBe(PostClassRefundClaimStudentStatusEnum.approved);
  });

  it('maps fulfilled or completed payout to settled', () => {
    expect(
      service.toStudentDisplayStatus(
        claim({
          adminStatus: PostClassRefundAdminStatusEnum.approved,
          fulfilledAt: new Date(),
        }),
      ),
    ).toBe(PostClassRefundClaimStudentStatusEnum.settled);
    expect(
      service.toStudentDisplayStatus(
        claim({ adminStatus: PostClassRefundAdminStatusEnum.approved }),
        ClassCancellationRefundPayoutStatusEnum.completed,
      ),
    ).toBe(PostClassRefundClaimStudentStatusEnum.settled);
  });
});
