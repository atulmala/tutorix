import {
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { SessionService } from '../auth/services/session.service';
import { DocumentScreeningEntity } from '../document/entities/document-screening.entity';
import { DocumentEntity } from '../document/entities/document.entity';
import { DocumentScreeningService } from '../document/services/document-screening.service';
import { DocumentService } from '../document/services/document.service';
import { ExperienceService } from '../experience/services/experience.service';
import { OfferingService } from '../offerings/services/offering.service';
import { ProficiencyTestService } from '../proficiency/services/proficiency-test.service';
import { ProficiencyTestEntity } from '../proficiency/entities/proficiency-test.entity';
import { Tutor } from '../tutor/entities/tutor.entity';
import { TutorOfferingEntity } from '../tutor/entities/tutor-offering.entity';
import { TutorCertificationStageEnum } from '../tutor/enums/tutor.enums';
import { TutorOfferingService } from '../tutor/services/tutor-offering.service';
import { TutorQualificationService } from '../tutor/services/tutor-qualification.service';
import { TutorService } from '../tutor/services/tutor.service';
import {
  applyAdminTutorSearchFilter,
  computeDaysInStage,
  countDocsStageTutorsPendingDocumentReview,
  findTutorIdsWithPendingDocumentReview,
  tutorHasPendingDocumentReviewExistsClause,
} from './admin-tutor.utils';
import { mapProficiencyTestToListItem } from './admin-proficiency-test.utils';
import { AdminDashboardStats } from './dto/admin-dashboard-stats.dto';
import { AdminTutorDetail } from './dto/admin-tutor-detail.dto';
import { AdminTutorDocumentDetail } from './dto/admin-tutor-document-detail.dto';
import { AdminTutorDocumentScreeningDetail } from './dto/admin-tutor-document-screening-detail.dto';
import { AdminTutorListInput } from './dto/admin-tutor-list.input';
import { AdminTutorListItem } from './dto/admin-tutor-list-item.dto';
import { AdminTutorListResult } from './dto/admin-tutor-list-result.dto';
import { AdminTutorOfferingDetail } from './dto/admin-tutor-offering-detail.dto';
import { AdminTutorStageCount } from './dto/admin-tutor-stage-count.dto';
import { AdminProficiencyTestListItem } from './dto/admin-proficiency-test-list-item.dto';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 20;
const PT_MAX_ATTEMPTS = 2;

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
    private readonly sessionService: SessionService,
    private readonly tutorService: TutorService,
    private readonly tutorQualificationService: TutorQualificationService,
    private readonly experienceService: ExperienceService,
    private readonly tutorOfferingService: TutorOfferingService,
    private readonly documentService: DocumentService,
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
    const [tutor, qualifications, experiences, offerings, documents] =
      await Promise.all([
        this.tutorService.findOneWithProfile(tutorId),
        this.tutorQualificationService.findByTutorId(tutorId),
        this.experienceService.findByTutorId(tutorId),
        this.tutorOfferingService.findByTutorId(tutorId),
        this.documentService.findOnboardingDocumentsByTutorId(tutorId),
      ]);

    const screeningMap = await this.documentScreeningService.findByDocumentIds(
      documents.map((doc) => doc.id),
    );

    const documentDetails = await Promise.all(
      documents.map((doc) =>
        this.mapDocumentDetail(doc, screeningMap.get(doc.id)),
      ),
    );

    const user = tutor.user;

    return {
      id: tutor.id,
      certificationStage: tutor.certificationStage,
      yearsOfExperience: tutor.yearsOfExperience,
      regFeePaid: tutor.regFeePaid,
      regFeeAmount: tutor.regFeeAmount,
      regFeeAmountToBePaid: tutor.regFeeAmountToBePaid,
      regFeeDate: tutor.regFeeDate,
      user: user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            mobile: user.mobile,
            mobileCountryCode: user.mobileCountryCode,
            mobileNumber: user.mobileNumber,
            createdDate: user.createdDate,
          }
        : undefined,
      addresses: tutor.addresses ?? [],
      qualifications,
      experiences,
      offerings: offerings.map((offering) => this.mapOfferingDetail(offering)),
      documents: documentDetails,
    };
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
    return this.mapDocumentDetail(document, screening);
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

  private mapOfferingDetail(offering: TutorOfferingEntity): AdminTutorOfferingDetail {
    return {
      id: offering.id,
      offeringName: offering.offering?.name,
      offeringDisplayName: offering.offering?.displayName,
      status: offering.status,
      attemptsUsed: offering.attemptsUsed,
      attemptsRemaining: Math.max(0, PT_MAX_ATTEMPTS - offering.attemptsUsed),
      lastScore: offering.lastScore,
      lastMaxScore: offering.lastMaxScore,
      lastAttemptAt: offering.lastAttemptAt,
      passedAt: offering.passedAt,
      lastTimeTakenSeconds: offering.lastTimeTakenSeconds,
      createdDate: offering.createdDate,
    };
  }

  private async mapDocumentDetail(
    doc: DocumentEntity,
    screening?: DocumentScreeningEntity,
  ): Promise<AdminTutorDocumentDetail> {
    const [previewUrl, viewUrl] = await Promise.all([
      this.documentService.resolvePreviewUrlForAdmin(doc),
      this.documentService.resolveViewUrlForAdmin(doc),
    ]);

    return {
      id: doc.id,
      name: doc.name,
      documentType: doc.documentType,
      filename: doc.filename,
      mimeType: doc.mimeType,
      previewUrl: previewUrl ?? undefined,
      viewUrl: viewUrl ?? undefined,
      screening: screening ? this.mapScreeningDetail(screening) : undefined,
      createdDate: doc.createdDate,
    };
  }

  private mapScreeningDetail(
    screening: DocumentScreeningEntity,
  ): AdminTutorDocumentScreeningDetail {
    return {
      status: screening.status,
      summaryNotes: screening.summaryNotes,
      confidence: screening.confidence,
      automatedAt: screening.automatedAt,
      reviewerNote: screening.reviewerNote,
      reviewedAt: screening.reviewedAt,
    };
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
