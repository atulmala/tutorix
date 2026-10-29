import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  canSubmitPostClassRefundClaim,
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
  formatPostClassRefundDeadlineIst,
  postClassRefundClaimDeadlineUtc,
  scheduledClassHasEnded,
} from '@tutorix/shared-utils';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { CommunicationAudience } from '../../communication/enums/communication-audience.enum';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { CommunicationService } from '../../communication/communication.service';
import { StudentService } from '../../student/services/student.service';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../enums/class-cancellation-refund-payout-status.enum';
import { ClassCreditRefundMethodEnum } from '../enums/class-credit-refund-method.enum';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';
import { PostClassRefundAdminStatusEnum } from '../enums/post-class-refund-admin-status.enum';
import { PostClassRefundClaimMethodEnum } from '../enums/post-class-refund-claim-method.enum';
import {
  postClassRefundClaimReasonLabel,
  PostClassRefundClaimReasonEnum,
} from '../enums/post-class-refund-claim-reason.enum';
import { PostClassRefundClaimStudentStatusEnum } from '../enums/post-class-refund-claim-student-status.enum';
import { PostClassRefundTutorResponseStatusEnum } from '../enums/post-class-refund-tutor-response-status.enum';
import { PostClassRefundClaimEntity } from '../entities/post-class-refund-claim.entity';
import { StudentClassCreditEntity } from '../entities/student-class-credit.entity';
import { ClassCancellationRefundPayoutService } from './class-cancellation-refund-payout.service';
import { ClassCancellationRefundRequestService } from './class-cancellation-refund-request.service';
import { ClassCreditCancellationService } from './class-credit-cancellation.service';

function asId(value: string | number): number {
  const id = Number(value);
  if (!Number.isFinite(id) || id < 1) {
    throw new NotFoundException('Class not found');
  }
  return id;
}

function personName(
  user?: { firstName?: string | null; lastName?: string | null } | null,
): string {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
}

export type PostClassRefundClaimEnrollmentFields = {
  postClassRefundClaimEligible: boolean;
  postClassRefundClaimId?: number | null;
  postClassRefundClaimStudentStatus?: PostClassRefundClaimStudentStatusEnum | null;
};

@Injectable()
export class PostClassRefundClaimService {
  private readonly logger = new Logger(PostClassRefundClaimService.name);

  constructor(
    private readonly studentService: StudentService,
    private readonly cancellationService: ClassCreditCancellationService,
    private readonly refundRequestService: ClassCancellationRefundRequestService,
    private readonly refundPayoutService: ClassCancellationRefundPayoutService,
    private readonly communicationService: CommunicationService,
    @InjectRepository(PostClassRefundClaimEntity)
    private readonly claimRepo: Repository<PostClassRefundClaimEntity>,
    @InjectRepository(StudentClassCreditEntity)
    private readonly creditRepo: Repository<StudentClassCreditEntity>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
  ) {}

  toStudentDisplayStatus(
    claim: PostClassRefundClaimEntity,
    payoutStatus?: ClassCancellationRefundPayoutStatusEnum | null,
  ): PostClassRefundClaimStudentStatusEnum {
    if (claim.adminStatus === PostClassRefundAdminStatusEnum.rejected) {
      return PostClassRefundClaimStudentStatusEnum.rejected;
    }
    if (
      claim.fulfilledAt != null ||
      payoutStatus === ClassCancellationRefundPayoutStatusEnum.completed
    ) {
      return PostClassRefundClaimStudentStatusEnum.settled;
    }
    if (claim.adminStatus === PostClassRefundAdminStatusEnum.approved) {
      return PostClassRefundClaimStudentStatusEnum.approved;
    }
    return PostClassRefundClaimStudentStatusEnum.under_process;
  }

  async tutorEnrollmentFields(
    _tutorId: number,
    enrollmentIds: number[],
  ): Promise<Map<number, { postClassRefundClaimId: number | null; pendingTutorAction: boolean }>> {
    const result = new Map<
      number,
      { postClassRefundClaimId: number | null; pendingTutorAction: boolean }
    >();
    if (enrollmentIds.length === 0) {
      return result;
    }
    const claims = await this.claimRepo.find({
      where: { enrollmentId: In(enrollmentIds), deleted: false },
    });
    for (const id of enrollmentIds) {
      result.set(id, { postClassRefundClaimId: null, pendingTutorAction: false });
    }
    for (const claim of claims) {
      result.set(claim.enrollmentId, {
        postClassRefundClaimId: claim.id,
        pendingTutorAction:
          claim.tutorResponseStatus === PostClassRefundTutorResponseStatusEnum.pending,
      });
    }
    return result;
  }

  async enrollmentFieldsForStudent(
    studentId: number,
    rows: Array<{
      enrollmentId: number;
      startsAt: Date;
      durationMinutes: number;
      isDemo?: boolean;
    }>,
  ): Promise<Map<number, PostClassRefundClaimEnrollmentFields>> {
    const enrollmentIds = rows.map((row) => row.enrollmentId);
    const claims =
      enrollmentIds.length > 0
        ? await this.claimRepo.find({
            where: { enrollmentId: In(enrollmentIds), studentId, deleted: false },
            relations: ['cancellationRefundRequest'],
          })
        : [];
    const claimByEnrollment = new Map(claims.map((c) => [c.enrollmentId, c]));
    const result = new Map<number, PostClassRefundClaimEnrollmentFields>();

    for (const row of rows) {
      const existing = claimByEnrollment.get(row.enrollmentId);
      if (existing) {
        result.set(row.enrollmentId, {
          postClassRefundClaimEligible: false,
          postClassRefundClaimId: existing.id,
          postClassRefundClaimStudentStatus: this.toStudentDisplayStatus(
            existing,
            existing.cancellationRefundRequest?.payoutStatus ?? null,
          ),
        });
        continue;
      }
      const eligible =
        row.isDemo !== true &&
        canSubmitPostClassRefundClaim(row.startsAt, row.durationMinutes);
      result.set(row.enrollmentId, {
        postClassRefundClaimEligible: eligible,
        postClassRefundClaimId: null,
        postClassRefundClaimStudentStatus: null,
      });
    }
    return result;
  }

  private creditRelations = [
    'orderItem',
    'student',
    'student.user',
    'enrollment',
    'enrollment.session',
    'enrollment.session.tutorCalendar',
    'tutorOffering',
    'tutorOffering.offering',
    'tutorOffering.tutor',
    'tutorOffering.tutor.user',
  ] as const;

  private async loadStudentCredit(
    studentId: number,
    enrollmentId: number,
  ): Promise<StudentClassCreditEntity> {
    const credit = await this.creditRepo.findOne({
      where: { enrollmentId, studentId, deleted: false },
      relations: [...this.creditRelations],
    });
    if (!credit) {
      throw new NotFoundException('Class not found');
    }
    return credit;
  }

  async previewForStudent(user: User, enrollmentIdInput: string | number) {
    const student = await this.requireStudent(user);
    const credit = await this.loadStudentCredit(student.id, asId(enrollmentIdInput));
    this.assertCanSubmit(credit);
    const { amountByCreditId, breakdownSnapshots } =
      await this.cancellationService.refundPreviewForStudentCredits(student.id, [credit]);
    const amountInr = amountByCreditId.get(credit.id) ?? 0;
    const snapshot = breakdownSnapshots.get(credit.orderItemId);
    return {
      enrollmentId: credit.enrollmentId!,
      amountInr,
      breakdownText: snapshot?.breakdownText ?? '',
      allowedMethods: this.allowedRefundMethods(PostClassRefundClaimReasonEnum.technical_issue),
    };
  }

  async previewForStudentWithReason(
    user: User,
    enrollmentIdInput: string | number,
    reason: PostClassRefundClaimReasonEnum,
  ) {
    const base = await this.previewForStudent(user, enrollmentIdInput);
    return {
      ...base,
      allowedMethods: this.allowedRefundMethods(reason),
    };
  }

  private allowedRefundMethods(
    reason: PostClassRefundClaimReasonEnum,
  ): PostClassRefundClaimMethodEnum[] {
    const all = [
      PostClassRefundClaimMethodEnum.gateway,
      PostClassRefundClaimMethodEnum.wallet,
      PostClassRefundClaimMethodEnum.class_credit,
    ];
    if (reason === PostClassRefundClaimReasonEnum.not_satisfied) {
      return all.filter((m) => m !== PostClassRefundClaimMethodEnum.class_credit);
    }
    return all;
  }

  private assertCanSubmit(credit: StudentClassCreditEntity): void {
    if (credit.isDemo === true) {
      throw new BadRequestException('Demo classes cannot be refunded');
    }
    if (credit.status === ClassCreditStatusEnum.cancelled) {
      throw new BadRequestException('This class is already cancelled');
    }
    const startsAt = credit.enrollment?.session?.tutorCalendar?.startsAt;
    const duration = credit.enrollment?.session?.tutorCalendar?.durationMinutes ?? null;
    if (!scheduledClassHasEnded(startsAt, duration)) {
      throw new BadRequestException('This class has not concluded yet');
    }
    if (!canSubmitPostClassRefundClaim(startsAt, duration)) {
      throw new BadRequestException('The time limit to claim a refund has passed');
    }
  }

  async submitClaim(
    user: User,
    enrollmentIdInput: string | number,
    reason: PostClassRefundClaimReasonEnum,
    refundMethod: PostClassRefundClaimMethodEnum,
  ): Promise<PostClassRefundClaimEntity> {
    const student = await this.requireStudent(user);
    const enrollmentId = asId(enrollmentIdInput);
    const existing = await this.claimRepo.findOne({
      where: { enrollmentId, deleted: false },
    });
    if (existing) {
      throw new BadRequestException('A refund claim already exists for this class');
    }

    const credit = await this.loadStudentCredit(student.id, enrollmentId);
    this.assertCanSubmit(credit);

    if (!this.allowedRefundMethods(reason).includes(refundMethod)) {
      throw new BadRequestException('This refund method is not allowed for the selected reason');
    }

    const { amountByCreditId, breakdownSnapshots } =
      await this.cancellationService.refundPreviewForStudentCredits(student.id, [credit]);
    const previewAmountInr =
      refundMethod === PostClassRefundClaimMethodEnum.class_credit
        ? 0
        : amountByCreditId.get(credit.id) ?? 0;
    const snapshot = breakdownSnapshots.get(credit.orderItemId);

    const calendar = credit.enrollment!.session!.tutorCalendar!;
    const startsAt = calendar.startsAt;
    const durationMinutes = calendar.durationMinutes ?? 60;
    const sessionTutorId = calendar.tutorId;
    const deadline = postClassRefundClaimDeadlineUtc(startsAt, durationMinutes);
    if (!deadline) {
      throw new BadRequestException('Could not determine claim deadline');
    }

    const claim = await this.claimRepo.save(
      this.claimRepo.create({
        enrollmentId,
        classCreditId: credit.id,
        studentId: student.id,
        tutorId: sessionTutorId,
        tutorOfferingId: credit.tutorOfferingId,
        orderItemId: credit.orderItemId,
        classStartsAt: startsAt,
        durationMinutes,
        deliveryMode: credit.deliveryMode as ClassSessionDeliveryModeEnum,
        offeringLabel: credit.tutorOffering?.offering?.displayName ?? 'Class',
        reason,
        refundMethod,
        previewAmountInr,
        refundBreakdownJson: snapshot as Record<string, unknown> | undefined,
        tutorResponseStatus: PostClassRefundTutorResponseStatusEnum.pending,
        adminStatus: PostClassRefundAdminStatusEnum.pending,
        tutorResponseDeadlineAt: deadline,
        submittedAt: new Date(),
        submittedByUserId: user.id,
      }),
    );

    await this.emitClaimRaisedToTutor(claim, credit);
    await this.emitTutorOnScreenAlert(claim, credit);

    return claim;
  }

  async tutorPendingAlert(user: User) {
    const tutor = await this.requireTutor(user);
    const claim = await this.claimForSessionTutorQuery(tutor.id)
      .andWhere('claim.tutor_response_status = :pending', {
        pending: PostClassRefundTutorResponseStatusEnum.pending,
      })
      .orderBy('claim.submitted_at', 'ASC')
      .getOne();
    if (!claim) {
      return null;
    }
    return {
      claimId: claim.id,
      deadlineLabel: formatPostClassRefundDeadlineIst(claim.classStartsAt, claim.durationMinutes),
    };
  }

  async tutorClaimDetail(user: User, claimId: number) {
    const tutor = await this.requireTutor(user);
    const claim = await this.requireClaimForSessionTutor(tutor.id, claimId);
    const credit = await this.creditRepo.findOne({
      where: { id: claim.classCreditId },
      relations: ['student', 'student.user'],
    });
    return { claim, studentName: personName(credit?.student?.user) || 'Student' };
  }

  async tutorRespond(
    user: User,
    claimId: number,
    accept: boolean,
    declineComment?: string | null,
  ): Promise<PostClassRefundClaimEntity> {
    const tutor = await this.requireTutor(user);
    const claim = await this.requireClaimForSessionTutor(tutor.id, claimId);
    if (claim.tutorResponseStatus !== PostClassRefundTutorResponseStatusEnum.pending) {
      throw new BadRequestException('You have already responded to this claim');
    }
    if (!accept && (!declineComment || declineComment.trim() === '')) {
      throw new BadRequestException('Please explain why you are declining');
    }
    claim.tutorResponseStatus = accept
      ? PostClassRefundTutorResponseStatusEnum.accepted
      : PostClassRefundTutorResponseStatusEnum.declined;
    claim.tutorDeclineComment = accept ? null : declineComment?.trim() ?? null;
    claim.tutorRespondedAt = new Date();
    return this.claimRepo.save(claim);
  }

  async applyDeemedTutorAcceptance(): Promise<number> {
    const now = new Date();
    const pending = await this.claimRepo.find({
      where: {
        deleted: false,
        tutorResponseStatus: PostClassRefundTutorResponseStatusEnum.pending,
      },
    });
    let updated = 0;
    for (const claim of pending) {
      if (claim.tutorResponseDeadlineAt.getTime() > now.getTime()) {
        continue;
      }
      claim.tutorResponseStatus = PostClassRefundTutorResponseStatusEnum.deemed_accepted;
      claim.tutorRespondedAt = now;
      await this.claimRepo.save(claim);
      updated += 1;
    }
    return updated;
  }

  async adminApprove(user: User, claimId: number): Promise<PostClassRefundClaimEntity> {
    const claim = await this.requireClaim(claimId);
    if (claim.adminStatus !== PostClassRefundAdminStatusEnum.pending) {
      throw new BadRequestException('This claim has already been processed');
    }

    const credit = await this.creditRepo.findOne({
      where: { id: claim.classCreditId, deleted: false },
      relations: [...this.creditRelations],
    });
    if (!credit?.student?.user) {
      throw new NotFoundException('Student not found');
    }
    const studentUser = credit.student.user;

    claim.adminStatus = PostClassRefundAdminStatusEnum.approved;
    claim.processedAt = new Date();
    claim.processedByUserId = user.id;

    if (claim.refundMethod === PostClassRefundClaimMethodEnum.class_credit) {
      await this.cancellationService.restoreConcludedCreditAsUnscheduled(
        credit,
        claim.studentId,
      );
      claim.fulfilledAt = new Date();
      await this.claimRepo.save(claim);
      await this.emitAdminDecision(claim, credit, 'approved');
      return claim;
    }

    const refundMethod =
      claim.refundMethod === PostClassRefundClaimMethodEnum.wallet
        ? ClassCreditRefundMethodEnum.wallet
        : ClassCreditRefundMethodEnum.gateway;

    const { refundRequestId } =
      await this.cancellationService.cancelConcludedCreditForPostClassClaim(
        studentUser,
        credit,
        refundMethod,
      );

    if (refundRequestId != null) {
      await this.refundRequestService.markAiApproved(refundRequestId);
      claim.cancellationRefundRequestId = refundRequestId;
      await this.claimRepo.save(claim);
      const processed = await this.refundPayoutService.processRefund(refundRequestId, user.id);
      if (processed.payoutStatus === ClassCancellationRefundPayoutStatusEnum.completed) {
        claim.fulfilledAt = new Date();
      }
      await this.claimRepo.save(claim);
    } else {
      claim.fulfilledAt = new Date();
      await this.claimRepo.save(claim);
    }

    await this.emitAdminDecision(claim, credit, 'approved');
    return (await this.requireClaim(claimId))!;
  }

  async adminReject(
    user: User,
    claimId: number,
    comment?: string | null,
  ): Promise<PostClassRefundClaimEntity> {
    const claim = await this.requireClaim(claimId);
    if (claim.adminStatus !== PostClassRefundAdminStatusEnum.pending) {
      throw new BadRequestException('This claim has already been processed');
    }
    claim.adminStatus = PostClassRefundAdminStatusEnum.rejected;
    claim.adminComment = comment?.trim() ?? null;
    claim.processedAt = new Date();
    claim.processedByUserId = user.id;
    await this.claimRepo.save(claim);
    const credit = await this.creditRepo.findOne({
      where: { id: claim.classCreditId },
      relations: [...this.creditRelations],
    });
    if (credit) {
      await this.emitAdminDecision(claim, credit, 'rejected');
    }
    return claim;
  }

  private async emitClaimRaisedToTutor(
    claim: PostClassRefundClaimEntity,
    credit: StudentClassCreditEntity,
  ): Promise<void> {
    const tutorUserId = credit.tutorOffering?.tutor?.userId ?? credit.tutorOffering?.tutor?.user?.id;
    if (!tutorUserId) {
      return;
    }
    const classTime = `${formatIstBookingDateLabel(claim.classStartsAt)} ${formatIstBookingTimeRange(
      claim.classStartsAt,
      claim.durationMinutes,
    )}`;
    try {
      await this.communicationService.emit({
        event: CommunicationEvent.POST_CLASS_REFUND_CLAIM_RAISED,
        userId: tutorUserId,
        audience: CommunicationAudience.TUTOR,
        entityType: 'post_class_refund_claim',
        entityId: claim.id,
        payload: {
          studentName: personName(credit.student?.user) || 'A student',
          classTime,
          offeringName: claim.offeringLabel,
          refundReasonLabel: postClassRefundClaimReasonLabel(claim.reason),
          tutorResponseDeadline: formatPostClassRefundDeadlineIst(
            claim.classStartsAt,
            claim.durationMinutes,
          ),
        },
      });
    } catch (error) {
      this.logger.warn(
        `POST_CLASS_REFUND_CLAIM_RAISED failed for claim ${claim.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async emitTutorOnScreenAlert(
    claim: PostClassRefundClaimEntity,
    credit: StudentClassCreditEntity,
  ): Promise<void> {
    const tutorUserId = credit.tutorOffering?.tutor?.userId ?? credit.tutorOffering?.tutor?.user?.id;
    if (!tutorUserId) {
      return;
    }
    const deadline = formatPostClassRefundDeadlineIst(claim.classStartsAt, claim.durationMinutes);
    try {
      await this.communicationService.emit({
        event: CommunicationEvent.POST_CLASS_REFUND_CLAIM_TUTOR_ALERT,
        userId: tutorUserId,
        audience: CommunicationAudience.TUTOR,
        entityType: 'post_class_refund_claim',
        entityId: claim.id,
        payload: {
          tutorResponseDeadline: deadline,
          claimId: String(claim.id),
        },
      });
    } catch (error) {
      this.logger.warn(
        `POST_CLASS_REFUND_CLAIM_TUTOR_ALERT failed for claim ${claim.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async emitAdminDecision(
    claim: PostClassRefundClaimEntity,
    credit: StudentClassCreditEntity,
    action: 'approved' | 'rejected',
  ): Promise<void> {
    const studentUserId = credit.student?.userId ?? credit.student?.user?.id;
    const tutorUserId = credit.tutorOffering?.tutor?.userId ?? credit.tutorOffering?.tutor?.user?.id;
    const classTime = `${formatIstBookingDateLabel(claim.classStartsAt)} ${formatIstBookingTimeRange(
      claim.classStartsAt,
      claim.durationMinutes,
    )}`;
    const payload = {
      studentName: personName(credit.student?.user) || 'Student',
      tutorName: personName(credit.tutorOffering?.tutor?.user) || 'Tutor',
      offeringName: claim.offeringLabel,
      classTime,
      actionLabel: action === 'approved' ? 'approved' : 'rejected',
      refundMethodLabel:
        claim.refundMethod === PostClassRefundClaimMethodEnum.class_credit
          ? 'Class credit'
          : claim.refundMethod === PostClassRefundClaimMethodEnum.wallet
            ? 'Wallet'
            : 'Payment method',
      amountInr: String(claim.previewAmountInr),
      adminComment: claim.adminComment ?? '',
    };
    for (const [userId, audience] of [
      [studentUserId, CommunicationAudience.STUDENT],
      [tutorUserId, CommunicationAudience.TUTOR],
    ] as const) {
      if (!userId) {
        continue;
      }
      try {
        await this.communicationService.emit({
          event: CommunicationEvent.POST_CLASS_REFUND_CLAIM_ADMIN_DECISION,
          userId,
          audience,
          entityType: 'post_class_refund_claim',
          entityId: claim.id,
          payload,
        });
      } catch (error) {
        this.logger.warn(
          `POST_CLASS_REFUND_CLAIM_ADMIN_DECISION failed for claim ${claim.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  private claimForSessionTutorQuery(tutorId: number) {
    return this.claimRepo
      .createQueryBuilder('claim')
      .leftJoinAndSelect('claim.cancellationRefundRequest', 'cancellationRefundRequest')
      .innerJoin(
        'tutor_class_session_enrollment',
        'enrollment',
        'enrollment.id = claim.enrollment_id AND enrollment.deleted = false',
      )
      .innerJoin(
        'tutor_class_session',
        'session',
        'session.id = enrollment.session_id AND session.deleted = false',
      )
      .innerJoin('tutor_calendar', 'calendar', 'calendar.id = session.tutor_calendar_id')
      .where('calendar.tutor_id = :tutorId', { tutorId })
      .andWhere('claim.deleted = false');
  }

  private async requireClaimForSessionTutor(
    tutorId: number,
    claimId: number,
  ): Promise<PostClassRefundClaimEntity> {
    const claim = await this.claimForSessionTutorQuery(tutorId)
      .andWhere('claim.id = :claimId', { claimId })
      .getOne();
    if (!claim) {
      throw new ForbiddenException('Not your refund claim');
    }
    if (claim.tutorId !== tutorId) {
      await this.claimRepo.update({ id: claim.id }, { tutorId });
      claim.tutorId = tutorId;
    }
    return claim;
  }

  private async requireClaim(id: number): Promise<PostClassRefundClaimEntity> {
    const claim = await this.claimRepo.findOne({
      where: { id, deleted: false },
      relations: ['cancellationRefundRequest'],
    });
    if (!claim) {
      throw new NotFoundException('Refund claim not found');
    }
    return claim;
  }

  private async requireStudent(user: User) {
    if (String(user.role).toUpperCase() !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can claim refunds');
    }
    const student = await this.studentService.findByUserId(user.id);
    if (!student) {
      throw new ForbiddenException('Student profile not found');
    }
    return student;
  }

  private async requireTutor(user: User) {
    if (String(user.role).toUpperCase() !== UserRole.TUTOR) {
      throw new ForbiddenException('Only tutors can respond to refund claims');
    }
    const tutor = await this.tutorRepo.findOne({
      where: { userId: user.id, deleted: false },
    });
    if (!tutor) {
      throw new ForbiddenException('Tutor profile not found');
    }
    return tutor;
  }
}
