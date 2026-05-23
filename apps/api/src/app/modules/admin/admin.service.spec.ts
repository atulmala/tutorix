import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { User } from '../auth/entities/user.entity';
import { Tutor } from '../tutor/entities/tutor.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { TutorCertificationStageEnum } from '../tutor/enums/tutor.enums';
import { SessionService } from '../auth/services/session.service';
import { DocumentScreeningService } from '../document/services/document-screening.service';
import { DocumentService } from '../document/services/document.service';
import { ExperienceService } from '../experience/services/experience.service';
import { TutorOfferingService } from '../tutor/services/tutor-offering.service';
import { TutorQualificationService } from '../tutor/services/tutor-qualification.service';
import { TutorService } from '../tutor/services/tutor.service';
import { YearsOfExperienceEnum } from '../tutor/enums/years-of-experience.enum';
import { TutorOfferingStatusEnum } from '../tutor/enums/tutor.enums';
import { DocumentTypeEnum } from '../document/enums/document-type.enum';
import { DocumentScreeningStatusEnum } from '../document/enums/document-screening-status.enum';
import * as adminTutorUtils from './admin-tutor.utils';

jest.mock('../document/document-image-media', () => ({
  buildTutorDocumentImageMediaPatch: jest.fn(),
}));

function createQueryBuilderMock() {
  const qb: Record<string, jest.Mock> = {
    innerJoinAndSelect: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    addSelect: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    select: jest.fn(),
    groupBy: jest.fn(),
    getManyAndCount: jest.fn(),
    getRawMany: jest.fn(),
  };
  for (const key of Object.keys(qb)) {
    qb[key].mockReturnValue(qb);
  }
  return qb;
}

describe('AdminService', () => {
  let service: AdminService;
  let userCount: jest.Mock;
  let tutorRepo: { createQueryBuilder: jest.Mock };
  let getActiveSessionStatsByRole: jest.Mock;
  let tutorService: {
    findOneWithProfile: jest.Mock;
  };
  let tutorQualificationService: { findByTutorId: jest.Mock };
  let experienceService: { findByTutorId: jest.Mock };
  let tutorOfferingService: { findByTutorId: jest.Mock };
  let documentService: {
    findOnboardingDocumentsByTutorId: jest.Mock;
    resolvePreviewUrlForAdmin: jest.Mock;
    resolveViewUrlForAdmin: jest.Mock;
  };
  let documentScreeningService: {
    findByDocumentIds: jest.Mock;
    reviewByAdmin: jest.Mock;
  };

  beforeEach(async () => {
    userCount = jest.fn();
    tutorRepo = { createQueryBuilder: jest.fn() };
    getActiveSessionStatsByRole = jest.fn().mockResolvedValue({
      tutorOnlineUsers: 4,
      studentOnlineUsers: 9,
      tutorActiveSessions: 6,
      studentActiveSessions: 11,
    });
    tutorService = { findOneWithProfile: jest.fn() };
    tutorQualificationService = { findByTutorId: jest.fn().mockResolvedValue([]) };
    experienceService = { findByTutorId: jest.fn().mockResolvedValue([]) };
    tutorOfferingService = { findByTutorId: jest.fn().mockResolvedValue([]) };
    documentService = {
      findOnboardingDocumentsByTutorId: jest.fn().mockResolvedValue([]),
      resolvePreviewUrlForAdmin: jest.fn().mockResolvedValue(null),
      resolveViewUrlForAdmin: jest.fn().mockResolvedValue(null),
    };
    documentScreeningService = {
      findByDocumentIds: jest.fn().mockResolvedValue(new Map()),
      reviewByAdmin: jest.fn(),
    };

    jest.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: { count: userCount },
        },
        {
          provide: getRepositoryToken(Tutor),
          useValue: tutorRepo,
        },
        {
          provide: SessionService,
          useValue: { getActiveSessionStatsByRole },
        },
        { provide: TutorService, useValue: tutorService },
        { provide: TutorQualificationService, useValue: tutorQualificationService },
        { provide: ExperienceService, useValue: experienceService },
        { provide: TutorOfferingService, useValue: tutorOfferingService },
        { provide: DocumentService, useValue: documentService },
        { provide: DocumentScreeningService, useValue: documentScreeningService },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  it('returns tutor and student signup counts', async () => {
    userCount.mockImplementation(({ where }: { where: { role: UserRole } }) => {
      if (where.role === UserRole.TUTOR) return Promise.resolve(12);
      if (where.role === UserRole.STUDENT) return Promise.resolve(34);
      return Promise.resolve(0);
    });

    const stats = await service.getDashboardStats();

    expect(stats).toEqual({
      tutorSignupCount: 12,
      studentSignupCount: 34,
      tutorOnlineUsers: 4,
      studentOnlineUsers: 9,
      tutorActiveSessions: 6,
      studentActiveSessions: 11,
    });
    expect(getActiveSessionStatsByRole).toHaveBeenCalled();
  });

  describe('listTutors', () => {
    it('filters by stage, paginates, and maps daysInStage', async () => {
      const qb = createQueryBuilderMock();
      const enteredAt = new Date('2026-05-17T12:00:00.000Z');
      qb.getManyAndCount.mockResolvedValue([
        [
          {
            id: 10,
            certificationStage: TutorCertificationStageEnum.address,
            certificationStageEnteredAt: enteredAt,
            user: {
              firstName: 'Ada',
              lastName: 'Lovelace',
              email: 'ada@example.com',
              mobile: '+91 9876543210',
            },
          },
        ],
        1,
      ]);
      tutorRepo.createQueryBuilder.mockReturnValue(qb);

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-22T12:00:00.000Z'));

      const result = await service.listTutors({
        certificationStage: TutorCertificationStageEnum.address,
        page: 1,
        pageSize: 20,
      });

      jest.useRealTimers();

      expect(tutorRepo.createQueryBuilder).toHaveBeenCalledWith('tutor');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'tutor.certificationStage = :stage',
        { stage: TutorCertificationStageEnum.address },
      );
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result).toMatchObject({
        totalCount: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        items: [
          {
            id: 10,
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.com',
            mobile: '+91 9876543210',
            daysInStage: 5,
            pendingAdminDocumentReview: false,
          },
        ],
      });
    });

    it('applies search filter when provided', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      tutorRepo.createQueryBuilder.mockReturnValue(qb);

      await service.listTutors({
        certificationStage: TutorCertificationStageEnum.docs,
        page: 2,
        pageSize: 20,
        search: '  ada  ',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE :term'),
        { term: '%ada%' },
      );
      expect(qb.skip).toHaveBeenCalledWith(20);
    });

    it('orders docs-stage tutors with pending review first and flags them', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([
        [
          {
            id: 20,
            certificationStage: TutorCertificationStageEnum.docs,
            certificationStageEnteredAt: new Date('2026-05-10T12:00:00.000Z'),
            user: {
              firstName: 'Review',
              lastName: 'Needed',
              email: 'review@example.com',
            },
          },
          {
            id: 21,
            certificationStage: TutorCertificationStageEnum.docs,
            certificationStageEnteredAt: new Date('2026-05-01T12:00:00.000Z'),
            user: {
              firstName: 'Clear',
              lastName: 'Tutor',
              email: 'clear@example.com',
            },
          },
        ],
        2,
      ]);
      tutorRepo.createQueryBuilder.mockReturnValue(qb);

      jest
        .spyOn(adminTutorUtils, 'findTutorIdsWithPendingDocumentReview')
        .mockResolvedValue(new Set([20]));

      const result = await service.listTutors({
        certificationStage: TutorCertificationStageEnum.docs,
        page: 1,
        pageSize: 20,
      });

      expect(qb.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('EXISTS'),
        'pending_review_rank',
      );
      expect(qb.orderBy).toHaveBeenCalledWith('pending_review_rank', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith(
        'tutor.certificationStageEnteredAt',
        'ASC',
        'NULLS LAST',
      );
      expect(result.items[0]).toMatchObject({
        id: 20,
        pendingAdminDocumentReview: true,
      });
      expect(result.items[1]).toMatchObject({
        id: 21,
        pendingAdminDocumentReview: false,
      });
    });
  });

  describe('getTutorStageCounts', () => {
    it('returns grouped stage counts with docs pending review count', async () => {
      const qb = createQueryBuilderMock();
      qb.getRawMany.mockResolvedValue([
        { stage: 'address', count: '12' },
        { stage: 'docs', count: '3' },
      ]);
      tutorRepo.createQueryBuilder.mockReturnValue(qb);

      jest
        .spyOn(adminTutorUtils, 'countDocsStageTutorsPendingDocumentReview')
        .mockResolvedValue(2);

      const counts = await service.getTutorStageCounts();

      expect(qb.groupBy).toHaveBeenCalledWith('tutor.certificationStage');
      expect(counts).toEqual([
        { stage: TutorCertificationStageEnum.address, count: 12 },
        {
          stage: TutorCertificationStageEnum.docs,
          count: 3,
          pendingDocumentReviewCount: 2,
        },
      ]);
    });
  });

  describe('getTutorDetail', () => {
    it('maps nested profile data, PT attempts remaining, and document URLs', async () => {
      const registrationDate = new Date('2026-01-10T12:00:00.000Z');
      tutorService.findOneWithProfile.mockResolvedValue({
        id: 7,
        certificationStage: TutorCertificationStageEnum.docs,
        yearsOfExperience: YearsOfExperienceEnum.TWO_TO_FIVE,
        regFeePaid: false,
        regFeeAmount: 0,
        regFeeAmountToBePaid: 999,
        regFeeDate: null,
        user: {
          firstName: 'Jane',
          lastName: 'Tutor',
          email: 'jane@example.com',
          mobile: '+91 9000000000',
          createdDate: registrationDate,
        },
        addresses: [{ id: 1, fullAddress: '123 Main St' }],
      });
      tutorQualificationService.findByTutorId.mockResolvedValue([
        { id: 11, qualificationType: 'GRADUATION', boardOrUniversity: 'DU' },
      ]);
      experienceService.findByTutorId.mockResolvedValue([
        { id: 21, jobTitle: 'Teacher' },
      ]);
      tutorOfferingService.findByTutorId.mockResolvedValue([
        {
          id: 31,
          status: TutorOfferingStatusEnum.pt_passed,
          attemptsUsed: 1,
          lastScore: 18,
          lastMaxScore: 20,
          offering: { name: 'math', displayName: 'Math' },
        },
      ]);
      documentService.findOnboardingDocumentsByTutorId.mockResolvedValue([
        {
          id: 41,
          name: 'PAN Card',
          documentType: DocumentTypeEnum.PAN_CARD,
          filename: 'pan.pdf',
          mimeType: 'application/pdf',
        },
      ]);
      documentScreeningService.findByDocumentIds.mockResolvedValue(
        new Map([
          [
            41,
            {
              status: DocumentScreeningStatusEnum.PENDING_HUMAN,
              summaryNotes: 'Name mismatch',
            },
          ],
        ]),
      );
      documentService.resolvePreviewUrlForAdmin.mockResolvedValue('https://preview');
      documentService.resolveViewUrlForAdmin.mockResolvedValue('https://view');

      const detail = await service.getTutorDetail(7);

      expect(detail).toMatchObject({
        id: 7,
        user: {
          firstName: 'Jane',
          lastName: 'Tutor',
          email: 'jane@example.com',
          createdDate: registrationDate,
        },
        addresses: [{ id: 1, fullAddress: '123 Main St' }],
        qualifications: [{ id: 11 }],
        experiences: [{ id: 21 }],
        offerings: [
          {
            id: 31,
            offeringDisplayName: 'Math',
            attemptsUsed: 1,
            attemptsRemaining: 1,
            lastScore: 18,
            lastMaxScore: 20,
          },
        ],
        documents: [
          {
            id: 41,
            previewUrl: 'https://preview',
            viewUrl: 'https://view',
            screening: {
              status: DocumentScreeningStatusEnum.PENDING_HUMAN,
              summaryNotes: 'Name mismatch',
            },
          },
        ],
      });
    });
  });
});
