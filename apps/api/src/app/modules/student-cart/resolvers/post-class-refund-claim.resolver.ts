import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  PostClassRefundClaimSummary,
  PreviewPostClassRefundClaimResult,
  TutorPostClassRefundClaimAlert,
  TutorPostClassRefundClaimDetail,
} from '../dto/post-class-refund-claim.dto';
import { AdminPostClassRefundClaimListInput } from '../dto/admin/admin-post-class-refund-claim-list.input';
import { AdminPostClassRefundClaimListItem } from '../dto/admin/admin-post-class-refund-claim-list-item.dto';
import { AdminPostClassRefundClaimListResult } from '../dto/admin/admin-post-class-refund-claim-list-result.dto';
import { PostClassRefundClaimMethodEnum } from '../enums/post-class-refund-claim-method.enum';
import { PostClassRefundClaimReasonEnum } from '../enums/post-class-refund-claim-reason.enum';
import { postClassRefundClaimReasonLabel } from '../enums/post-class-refund-claim-reason.enum';
import { AdminPostClassRefundClaimService } from '../services/admin-post-class-refund-claim.service';
import { PostClassRefundClaimService } from '../services/post-class-refund-claim.service';
import {
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
  formatPostClassRefundDeadlineIst,
} from '@tutorix/shared-utils';

@Resolver()
export class PostClassRefundClaimResolver {
  constructor(
    private readonly claimService: PostClassRefundClaimService,
    private readonly adminClaimService: AdminPostClassRefundClaimService,
  ) {}

  @Query(() => PreviewPostClassRefundClaimResult, { name: 'previewPostClassRefundClaim' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async previewPostClassRefundClaim(
    @CurrentUser() user: User,
    @Args('enrollmentId', { type: () => ID }) enrollmentId: string,
    @Args('reason', { type: () => PostClassRefundClaimReasonEnum })
    reason: PostClassRefundClaimReasonEnum,
  ): Promise<PreviewPostClassRefundClaimResult> {
    return this.claimService.previewForStudentWithReason(user, enrollmentId, reason);
  }

  @Mutation(() => PostClassRefundClaimSummary, { name: 'submitPostClassRefundClaim' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async submitPostClassRefundClaim(
    @CurrentUser() user: User,
    @Args('enrollmentId', { type: () => ID }) enrollmentId: string,
    @Args('reason', { type: () => PostClassRefundClaimReasonEnum })
    reason: PostClassRefundClaimReasonEnum,
    @Args('refundMethod', { type: () => PostClassRefundClaimMethodEnum })
    refundMethod: PostClassRefundClaimMethodEnum,
  ): Promise<PostClassRefundClaimSummary> {
    const claim = await this.claimService.submitClaim(user, enrollmentId, reason, refundMethod);
    return {
      id: claim.id,
      enrollmentId: claim.enrollmentId,
      studentStatus: this.claimService.toStudentDisplayStatus(claim),
    };
  }

  @Query(() => TutorPostClassRefundClaimAlert, {
    name: 'tutorPendingPostClassRefundClaimAlert',
    nullable: true,
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TUTOR)
  tutorPendingPostClassRefundClaimAlert(
    @CurrentUser() user: User,
  ): Promise<TutorPostClassRefundClaimAlert | null> {
    return this.claimService.tutorPendingAlert(user);
  }

  @Query(() => TutorPostClassRefundClaimDetail, { name: 'tutorPostClassRefundClaimDetail' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TUTOR)
  async tutorPostClassRefundClaimDetail(
    @CurrentUser() user: User,
    @Args('claimId', { type: () => Int }) claimId: number,
  ): Promise<TutorPostClassRefundClaimDetail> {
    const { claim, studentName } = await this.claimService.tutorClaimDetail(user, claimId);
    const classTimeLabel = `${formatIstBookingDateLabel(claim.classStartsAt)} ${formatIstBookingTimeRange(
      claim.classStartsAt,
      claim.durationMinutes,
    )}`;
    return {
      claimId: claim.id,
      studentName,
      offeringLabel: claim.offeringLabel,
      classTimeLabel,
      reason: claim.reason,
      reasonLabel: postClassRefundClaimReasonLabel(claim.reason),
      deadlineLabel: formatPostClassRefundDeadlineIst(claim.classStartsAt, claim.durationMinutes),
      tutorResponseStatus: claim.tutorResponseStatus,
    };
  }

  @Mutation(() => PostClassRefundClaimSummary, { name: 'tutorRespondPostClassRefundClaim' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TUTOR)
  async tutorRespondPostClassRefundClaim(
    @CurrentUser() user: User,
    @Args('claimId', { type: () => Int }) claimId: number,
    @Args('accept') accept: boolean,
    @Args('declineComment', { nullable: true }) declineComment?: string,
  ): Promise<PostClassRefundClaimSummary> {
    const claim = await this.claimService.tutorRespond(user, claimId, accept, declineComment);
    return {
      id: claim.id,
      enrollmentId: claim.enrollmentId,
      studentStatus: this.claimService.toStudentDisplayStatus(claim),
    };
  }

  @Query(() => AdminPostClassRefundClaimListResult, { name: 'adminPostClassRefundClaims' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminPostClassRefundClaims(
    @Args('input') input: AdminPostClassRefundClaimListInput,
  ): Promise<AdminPostClassRefundClaimListResult> {
    return this.adminClaimService.list(input);
  }

  @Mutation(() => AdminPostClassRefundClaimListItem, { name: 'adminApprovePostClassRefundClaim' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminApprovePostClassRefundClaim(
    @CurrentUser() user: User,
    @Args('claimId', { type: () => Int }) claimId: number,
  ): Promise<AdminPostClassRefundClaimListItem> {
    await this.claimService.adminApprove(user, claimId);
    return this.adminClaimService.getDetail(claimId);
  }

  @Mutation(() => AdminPostClassRefundClaimListItem, { name: 'adminRejectPostClassRefundClaim' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminRejectPostClassRefundClaim(
    @CurrentUser() user: User,
    @Args('claimId', { type: () => Int }) claimId: number,
    @Args('comment', { nullable: true }) comment?: string,
  ): Promise<AdminPostClassRefundClaimListItem> {
    await this.claimService.adminReject(user, claimId, comment);
    return this.adminClaimService.getDetail(claimId);
  }
}
