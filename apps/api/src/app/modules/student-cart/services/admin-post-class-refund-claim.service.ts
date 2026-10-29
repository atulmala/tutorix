import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { personDisplayName } from '../admin-class-booking.utils';
import { AdminPostClassRefundClaimListInput } from '../dto/admin/admin-post-class-refund-claim-list.input';
import { AdminPostClassRefundClaimListItem } from '../dto/admin/admin-post-class-refund-claim-list-item.dto';
import { AdminPostClassRefundClaimListResult } from '../dto/admin/admin-post-class-refund-claim-list-result.dto';
import { PostClassRefundClaimEntity } from '../entities/post-class-refund-claim.entity';
import { postClassRefundClaimReasonLabel } from '../enums/post-class-refund-claim-reason.enum';
import { PostClassRefundClaimService } from './post-class-refund-claim.service';

@Injectable()
export class AdminPostClassRefundClaimService {
  constructor(
    @InjectRepository(PostClassRefundClaimEntity)
    private readonly claimRepo: Repository<PostClassRefundClaimEntity>,
    private readonly claimService: PostClassRefundClaimService,
  ) {}

  async list(input: AdminPostClassRefundClaimListInput): Promise<AdminPostClassRefundClaimListResult> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;

    const qb = this.claimRepo
      .createQueryBuilder('claim')
      .leftJoin('claim.student', 'student')
      .leftJoin('student.user', 'studentUser')
      .leftJoin('claim.tutor', 'tutor')
      .leftJoin('tutor.user', 'tutorUser')
      .where('claim.deleted = false');

    if (input.adminStatus) {
      qb.andWhere('claim.admin_status = :adminStatus', { adminStatus: input.adminStatus });
    }
    if (input.studentSearch?.trim()) {
      const term = `%${input.studentSearch.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(studentUser.firstName) LIKE :term OR LOWER(studentUser.lastName) LIKE :term OR LOWER(studentUser.email) LIKE :term)`,
        { term },
      );
    }

    const total = await qb.getCount();
    const rows = await qb
      .orderBy('claim.submittedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const ids = rows.map((row) => row.id);
    const withRelations =
      ids.length > 0
        ? await this.claimRepo.find({
            where: ids.map((id) => ({ id, deleted: false })),
            relations: [
              'student',
              'student.user',
              'tutor',
              'tutor.user',
              'cancellationRefundRequest',
            ],
          })
        : [];
    const byId = new Map(withRelations.map((row) => [row.id, row]));

    const items: AdminPostClassRefundClaimListItem[] = rows.map((row) => {
      const full = byId.get(row.id) ?? row;
      return this.toListItem(full);
    });

    return { items, total, page, pageSize };
  }

  async getDetail(claimId: number): Promise<AdminPostClassRefundClaimListItem> {
    const claim = await this.claimRepo.findOne({
      where: { id: claimId, deleted: false },
      relations: [
        'student',
        'student.user',
        'tutor',
        'tutor.user',
        'cancellationRefundRequest',
      ],
    });
    if (!claim) {
      throw new NotFoundException('Refund claim not found');
    }
    return this.toListItem(claim);
  }

  private toListItem(claim: PostClassRefundClaimEntity): AdminPostClassRefundClaimListItem {
    return {
      id: claim.id,
      studentId: claim.studentId,
      studentName:
        personDisplayName(
          claim.student?.user?.firstName,
          claim.student?.user?.lastName,
        ) || 'Student',
      tutorId: claim.tutorId,
      tutorName:
        personDisplayName(claim.tutor?.user?.firstName, claim.tutor?.user?.lastName) ||
        'Tutor',
      offeringLabel: claim.offeringLabel,
      classStartsAt: claim.classStartsAt,
      durationMinutes: claim.durationMinutes,
      deliveryMode: claim.deliveryMode,
      reason: claim.reason,
      reasonLabel: postClassRefundClaimReasonLabel(claim.reason),
      refundMethod: claim.refundMethod,
      previewAmountInr: claim.previewAmountInr,
      tutorResponseStatus: claim.tutorResponseStatus,
      tutorDeclineComment: claim.tutorDeclineComment ?? null,
      adminStatus: claim.adminStatus,
      adminComment: claim.adminComment ?? null,
      studentStatus: this.claimService.toStudentDisplayStatus(
        claim,
        claim.cancellationRefundRequest?.payoutStatus ?? null,
      ),
      submittedAt: claim.submittedAt,
    };
  }
}
