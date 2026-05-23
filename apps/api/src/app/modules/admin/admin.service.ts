import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { SessionService } from '../auth/services/session.service';
import { Tutor } from '../tutor/entities/tutor.entity';
import { TutorCertificationStageEnum } from '../tutor/enums/tutor.enums';
import {
  applyAdminTutorSearchFilter,
  computeDaysInStage,
  countDocsStageTutorsPendingDocumentReview,
  findTutorIdsWithPendingDocumentReview,
  tutorHasPendingDocumentReviewExistsClause,
} from './admin-tutor.utils';
import { AdminDashboardStats } from './dto/admin-dashboard-stats.dto';
import { AdminTutorListInput } from './dto/admin-tutor-list.input';
import { AdminTutorListItem } from './dto/admin-tutor-list-item.dto';
import { AdminTutorListResult } from './dto/admin-tutor-list-result.dto';
import { AdminTutorStageCount } from './dto/admin-tutor-stage-count.dto';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 20;

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
    private readonly sessionService: SessionService,
  ) {}

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const [tutorSignupCount, studentSignupCount, onlineStats] = await Promise.all([
      this.userRepo.count({
        where: { role: UserRole.TUTOR, deleted: false },
      }),
      this.userRepo.count({
        where: { role: UserRole.STUDENT, deleted: false },
      }),
      this.sessionService.getActiveSessionStatsByRole(),
    ]);

    return {
      tutorSignupCount,
      studentSignupCount,
      tutorOnlineUsers: onlineStats.tutorOnlineUsers,
      studentOnlineUsers: onlineStats.studentOnlineUsers,
      tutorActiveSessions: onlineStats.tutorActiveSessions,
      studentActiveSessions: onlineStats.studentActiveSessions,
    };
  }

  async listTutors(input: AdminTutorListInput): Promise<AdminTutorListResult> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE),
    );
    const isDocsStage = input.certificationStage === TutorCertificationStageEnum.docs;

    const qb = this.tutorRepo
      .createQueryBuilder('tutor')
      .innerJoinAndSelect('tutor.user', 'user')
      .where('tutor.deleted = :deleted', { deleted: false })
      .andWhere('tutor.certificationStage = :stage', {
        stage: input.certificationStage,
      });

    applyAdminTutorSearchFilter(qb, input.search);

    if (isDocsStage) {
      qb.addSelect(
        `CASE WHEN ${tutorHasPendingDocumentReviewExistsClause()} THEN 1 ELSE 0 END`,
        'pending_review_rank',
      );
      qb.orderBy('pending_review_rank', 'DESC');
      qb.addOrderBy('tutor.certificationStageEnteredAt', 'ASC', 'NULLS LAST');
    } else {
      qb.orderBy('tutor.certificationStageEnteredAt', 'ASC', 'NULLS LAST');
    }

    const skip = (page - 1) * pageSize;
    const [tutors, totalCount] = await qb.skip(skip).take(pageSize).getManyAndCount();

    const pendingReviewIds = isDocsStage
      ? await findTutorIdsWithPendingDocumentReview(
          this.tutorRepo,
          tutors.map((tutor) => tutor.id),
        )
      : new Set<number>();

    const items: AdminTutorListItem[] = tutors.map((tutor) =>
      this.toAdminTutorListItem(tutor, pendingReviewIds),
    );

    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize),
    };
  }

  async getTutorStageCounts(search?: string): Promise<AdminTutorStageCount[]> {
    const qb = this.tutorRepo
      .createQueryBuilder('tutor')
      .innerJoin('tutor.user', 'user')
      .select('tutor.certificationStage', 'stage')
      .addSelect('COUNT(tutor.id)', 'count')
      .where('tutor.deleted = :deleted', { deleted: false })
      .groupBy('tutor.certificationStage');

    applyAdminTutorSearchFilter(qb, search);

    const [rows, pendingDocumentReviewCount] = await Promise.all([
      qb.getRawMany<{ stage: string; count: string }>(),
      countDocsStageTutorsPendingDocumentReview(this.tutorRepo, search),
    ]);

    return rows.map((row) => ({
      stage: row.stage as TutorCertificationStageEnum,
      count: parseInt(row.count, 10),
      ...(row.stage === TutorCertificationStageEnum.docs
        ? { pendingDocumentReviewCount }
        : {}),
    }));
  }

  private toAdminTutorListItem(
    tutor: Tutor,
    pendingReviewIds: Set<number> = new Set(),
  ): AdminTutorListItem {
    const user = tutor.user;
    return {
      id: tutor.id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      mobile: user?.mobile,
      mobileCountryCode: user?.mobileCountryCode,
      mobileNumber: user?.mobileNumber,
      certificationStage: tutor.certificationStage,
      daysInStage: computeDaysInStage(tutor.certificationStageEnteredAt),
      pendingAdminDocumentReview: pendingReviewIds.has(tutor.id),
    };
  }
}
