import {
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { SessionService } from '../auth/services/session.service';
import { DocumentScreeningService } from '../document/services/document-screening.service';
import { OfferingService } from '../offerings/services/offering.service';
import { ProficiencyTestService } from '../proficiency/services/proficiency-test.service';
import { ProficiencyTestEntity } from '../proficiency/entities/proficiency-test.entity';
import { Tutor } from '../tutor/entities/tutor.entity';
import { TutorCertificationStageEnum } from '../tutor/enums/tutor.enums';
import { Student } from '../student/entities/student.entity';
import { StudentOnboardingStageEnum } from '../student/enums/student.enums';
import { TutorService } from '../tutor/services/tutor.service';
import { TutorDetailService } from '../tutor/services/tutor-detail.service';
import {
  applyAdminTutorSearchFilter,
  computeDaysInStage,
  countDocsStageTutorsPendingDocumentReview,
  findTutorIdsWithPendingDocumentReview,
  tutorHasPendingDocumentReviewExistsClause,
} from './admin-tutor.utils';
import { applyAdminStudentSearchFilter } from './admin-student.utils';
import { mapProficiencyTestToListItem } from './admin-proficiency-test.utils';
import { AdminDashboardStats } from './dto/admin-dashboard-stats.dto';
import { AdminStudentListInput } from './dto/admin-student-list.input';
import { AdminStudentListItem } from './dto/admin-student-list-item.dto';
import { AdminStudentListResult } from './dto/admin-student-list-result.dto';
import { AdminStudentStageCount } from './dto/admin-student-stage-count.dto';
import { AdminTutorDetail } from './dto/admin-tutor-detail.dto';
import { AdminTutorDocumentDetail } from './dto/admin-tutor-document-detail.dto';
import { AdminTutorListInput } from './dto/admin-tutor-list.input';
import { AdminTutorListItem } from './dto/admin-tutor-list-item.dto';
import { AdminTutorListResult } from './dto/admin-tutor-list-result.dto';
import { AdminTutorStageCount } from './dto/admin-tutor-stage-count.dto';
import { AdminProficiencyTestListItem } from './dto/admin-proficiency-test-list-item.dto';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 20;

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly sessionService: SessionService,
    private readonly tutorService: TutorService,
    private readonly tutorDetailService: TutorDetailService,
    private readonly documentScreeningService: DocumentScreeningService,
    private readonly proficiencyTestService: ProficiencyTestService,
    private readonly offeringService: OfferingService,
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

  async getTutorDetail(tutorId: number): Promise<AdminTutorDetail> {
    return this.tutorDetailService.getTutorDetail(tutorId);
  }

  async reviewDocument(
    documentId: number,
    approve: boolean,
    adminUserId: number,
    note?: string,
  ): Promise<AdminTutorDocumentDetail> {
    const { document, screening } =
      await this.documentScreeningService.reviewByAdmin(
        documentId,
        approve,
        adminUserId,
        note,
      );
    return this.tutorDetailService.mapDocumentDetail(document, screening);
  }

  async setTestTutor(tutorId: number, testTutor: boolean): Promise<AdminTutorDetail> {
    await this.tutorService.updateTestTutor(tutorId, testTutor);
    return this.getTutorDetail(tutorId);
  }

  async listTutors(input: AdminTutorListInput): Promise<AdminTutorListResult> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE),
    );
    const hasStageFilter = input.certificationStage != null;
    const isDocsStage = input.certificationStage === TutorCertificationStageEnum.docs;

    const qb = this.tutorRepo
      .createQueryBuilder('tutor')
      .innerJoinAndSelect('tutor.user', 'user')
      .where('tutor.deleted = :deleted', { deleted: false });

    if (hasStageFilter) {
      qb.andWhere('tutor.certificationStage = :stage', {
        stage: input.certificationStage,
      });
    }

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

    const pendingReviewIds =
      (isDocsStage || !hasStageFilter) && tutors.length > 0
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

  async listStudents(input: AdminStudentListInput): Promise<AdminStudentListResult> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE),
    );
    const hasSearch = Boolean(input.search?.trim());

    const qb = this.studentRepo
      .createQueryBuilder('student')
      .innerJoinAndSelect('student.user', 'user')
      .where('student.deleted = :deleted', { deleted: false });

    if (!hasSearch) {
      if (input.completedOnly) {
        qb.andWhere('student.onBoardingComplete = :complete', { complete: true });
      } else if (input.onboardingStage != null) {
        qb.andWhere('student.onboardingStage = :stage', {
          stage: input.onboardingStage,
        });
        qb.andWhere('student.onBoardingComplete = :complete', { complete: false });
      }
    }

    applyAdminStudentSearchFilter(qb, input.search);
    qb.orderBy('student.onboardingStageEnteredAt', 'ASC', 'NULLS LAST');

    const skip = (page - 1) * pageSize;
    const [students, totalCount] = await qb.skip(skip).take(pageSize).getManyAndCount();

    const items: AdminStudentListItem[] = students.map((student) =>
      this.toAdminStudentListItem(student),
    );

    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize),
    };
  }

  async getStudentStageCounts(): Promise<AdminStudentStageCount[]> {
    const [inProgressRows, completeCount] = await Promise.all([
      this.studentRepo
        .createQueryBuilder('student')
        .select('student.onboardingStage', 'stage')
        .addSelect('COUNT(student.id)', 'count')
        .where('student.deleted = :deleted', { deleted: false })
        .andWhere('student.onBoardingComplete = :complete', { complete: false })
        .groupBy('student.onboardingStage')
        .getRawMany<{ stage: string; count: string }>(),
      this.studentRepo.count({
        where: { deleted: false, onBoardingComplete: true },
      }),
    ]);

    const countByStage = new Map<string, number>();
    for (const row of inProgressRows) {
      if (row.stage) {
        countByStage.set(row.stage, parseInt(row.count, 10));
      }
    }

    const orderedStages: Array<{ stage: string; count: number }> = [
      StudentOnboardingStageEnum.parent,
      StudentOnboardingStageEnum.address,
      StudentOnboardingStageEnum.education,
    ].map((stage) => ({
      stage,
      count: countByStage.get(stage) ?? 0,
    }));

    orderedStages.push({ stage: 'complete', count: completeCount });

    return orderedStages;
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

  async listProficiencyTests(): Promise<AdminProficiencyTestListItem[]> {
    const [tests, offerings] = await Promise.all([
      this.proficiencyTestService.findAllForAdmin(),
      this.offeringService.findAll(),
    ]);

    const offeringsById = new Map(offerings.map((offering) => [offering.id, offering]));

    return tests.map((test) =>
      mapProficiencyTestToListItem(
        test,
        offeringsById,
        (test as ProficiencyTestEntity & { questionCount?: number }).questionCount ?? 0,
      ),
    );
  }

  async getProficiencyTestDetail(testId: number): Promise<ProficiencyTestEntity> {
    return this.proficiencyTestService.getTestWithAllQuestionsForAdmin(testId);
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
      testTutor: tutor.testTutor ?? false,
    };
  }

  private toAdminStudentListItem(student: Student): AdminStudentListItem {
    const user = student.user;
    return {
      id: student.id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      mobile: user?.mobile,
      mobileCountryCode: user?.mobileCountryCode,
      mobileNumber: user?.mobileNumber,
      onboardingStage: student.onboardingStage,
      onBoardingComplete: student.onBoardingComplete,
      daysInStage: computeDaysInStage(student.onboardingStageEnteredAt),
    };
  }
}
