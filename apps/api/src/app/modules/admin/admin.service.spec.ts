import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { User } from '../auth/entities/user.entity';
import { Tutor } from '../tutor/entities/tutor.entity';
import { Student } from '../student/entities/student.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { TutorCertificationStageEnum } from '../tutor/enums/tutor.enums';
import { StudentOnboardingStageEnum } from '../student/enums/student.enums';
import { SessionService } from '../auth/services/session.service';
import { DocumentScreeningService } from '../document/services/document-screening.service';
import { TutorService } from '../tutor/services/tutor.service';
import { TutorDetailService } from '../tutor/services/tutor-detail.service';
import { ProficiencyTestService } from '../proficiency/services/proficiency-test.service';
import { OfferingService } from '../offerings/services/offering.service';
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
  let studentRepo: { createQueryBuilder: jest.Mock; count: jest.Mock };
  let getActiveSessionStatsByRole: jest.Mock;
  let tutorService: {
    findOneWithProfile: jest.Mock;
    updateTestTutor: jest.Mock;
  };
  let tutorDetailService: {
    getTutorDetail: jest.Mock;
    mapDocumentDetail: jest.Mock;
  };
  let documentScreeningService: {
    reviewByAdmin: jest.Mock;
  };
  let proficiencyTestService: {
    findAllForAdmin: jest.Mock;
    getTestWithAllQuestionsForAdmin: jest.Mock;
  };
  let offeringService: { findAll: jest.Mock };

  beforeEach(async () => {
    userCount = jest.fn();
    tutorRepo = { createQueryBuilder: jest.fn() };
    studentRepo = { createQueryBuilder: jest.fn(), count: jest.fn() };
    getActiveSessionStatsByRole = jest.fn().mockResolvedValue({
      tutorOnlineUsers: 4,
      studentOnlineUsers: 9,
      tutorActiveSessions: 6,
      studentActiveSessions: 11,
    });
    tutorService = { findOneWithProfile: jest.fn(), updateTestTutor: jest.fn() };
    tutorDetailService = {
      getTutorDetail: jest.fn(),
      mapDocumentDetail: jest.fn(),
    };
    documentScreeningService = {
      reviewByAdmin: jest.fn(),
    };
    proficiencyTestService = {
      findAllForAdmin: jest.fn().mockResolvedValue([]),
      getTestWithAllQuestionsForAdmin: jest.fn(),
    };
    offeringService = { findAll: jest.fn().mockResolvedValue([]) };

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
          provide: getRepositoryToken(Student),
          useValue: studentRepo,
        },
        {
          provide: SessionService,
          useValue: { getActiveSessionStatsByRole },
        },
        { provide: TutorService, useValue: tutorService },
        { provide: TutorDetailService, useValue: tutorDetailService },
        { provide: DocumentScreeningService, useValue: documentScreeningService },
        { provide: ProficiencyTestService, useValue: proficiencyTestService },
        { provide: OfferingService, useValue: offeringService },
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

    it('searches across all stages when certificationStage is omitted', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      tutorRepo.createQueryBuilder.mockReturnValue(qb);

      await service.listTutors({
        page: 1,
        pageSize: 20,
        search: 'anna@gmail.com',
      });

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'tutor.certificationStage = :stage',
        expect.anything(),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE :term'),
        { term: '%anna@gmail.com%' },
      );
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

  describe('listStudents', () => {
    it('filters education stage to in-progress students and maps daysInStage', async () => {
      const qb = createQueryBuilderMock();
      const enteredAt = new Date('2026-05-17T12:00:00.000Z');
      qb.getManyAndCount.mockResolvedValue([
        [
          {
            id: 3,
            onboardingStage: StudentOnboardingStageEnum.education,
            onBoardingComplete: false,
            onboardingStageEnteredAt: enteredAt,
            user: {
              firstName: 'Sam',
              lastName: 'Student',
              email: 'sam@example.com',
            },
          },
        ],
        1,
      ]);
      studentRepo.createQueryBuilder.mockReturnValue(qb);

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-22T12:00:00.000Z'));

      const result = await service.listStudents({
        onboardingStage: StudentOnboardingStageEnum.education,
        page: 1,
        pageSize: 20,
      });

      jest.useRealTimers();

      expect(studentRepo.createQueryBuilder).toHaveBeenCalledWith('student');
      expect(qb.andWhere).toHaveBeenCalledWith('student.onboardingStage = :stage', {
        stage: StudentOnboardingStageEnum.education,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('student.onBoardingComplete = :complete', {
        complete: false,
      });
      expect(result.items[0]).toMatchObject({
        id: 3,
        firstName: 'Sam',
        lastName: 'Student',
        daysInStage: 5,
        onBoardingComplete: false,
      });
    });

    it('filters complete tab by onBoardingComplete', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      studentRepo.createQueryBuilder.mockReturnValue(qb);

      await service.listStudents({
        completedOnly: true,
        page: 1,
        pageSize: 20,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('student.onBoardingComplete = :complete', {
        complete: true,
      });
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'student.onboardingStage = :stage',
        expect.anything(),
      );
    });

    it('searches across all stages when search is provided', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      studentRepo.createQueryBuilder.mockReturnValue(qb);

      await service.listStudents({
        page: 1,
        pageSize: 20,
        search: 'sam@example.com',
      });

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'student.onboardingStage = :stage',
        expect.anything(),
      );
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'student.onBoardingComplete = :complete',
        expect.anything(),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE :term'),
        { term: '%sam@example.com%' },
      );
    });
  });

  describe('getStudentStageCounts', () => {
    it('returns in-progress stage counts plus complete total', async () => {
      const qb = createQueryBuilderMock();
      qb.getRawMany.mockResolvedValue([
        { stage: 'parent', count: '4' },
        { stage: 'education', count: '2' },
      ]);
      studentRepo.createQueryBuilder.mockReturnValue(qb);
      studentRepo.count.mockResolvedValue(7);

      const counts = await service.getStudentStageCounts();

      expect(qb.groupBy).toHaveBeenCalledWith('student.onboardingStage');
      expect(studentRepo.count).toHaveBeenCalledWith({
        where: { deleted: false, onBoardingComplete: true },
      });
      expect(counts).toEqual([
        { stage: StudentOnboardingStageEnum.parent, count: 4 },
        { stage: StudentOnboardingStageEnum.address, count: 0 },
        { stage: StudentOnboardingStageEnum.education, count: 2 },
        { stage: 'complete', count: 7 },
      ]);
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
    it('delegates to TutorDetailService', async () => {
      const expected = { id: 7, testTutor: false };
      tutorDetailService.getTutorDetail.mockResolvedValue(expected);

      const detail = await service.getTutorDetail(7);

      expect(tutorDetailService.getTutorDetail).toHaveBeenCalledWith(7);
      expect(detail).toBe(expected);
    });
  });

  describe('setTestTutor', () => {
    it('updates test tutor flag and returns refreshed detail', async () => {
      tutorService.updateTestTutor.mockResolvedValue({ id: 7, testTutor: true });
      tutorDetailService.getTutorDetail.mockResolvedValue({
        id: 7,
        testTutor: true,
      });

      const detail = await service.setTestTutor(7, true);

      expect(tutorService.updateTestTutor).toHaveBeenCalledWith(7, true);
      expect(tutorDetailService.getTutorDetail).toHaveBeenCalledWith(7);
      expect(detail.testTutor).toBe(true);
    });
  });

  describe('listProficiencyTests', () => {
    it('maps proficiency tests with offering metadata and question counts', async () => {
      const root = {
        id: 1,
        displayName: 'School Education',
        level: 0,
        deleted: false,
      };
      const board = {
        id: 10,
        displayName: 'CBSE',
        level: 1,
        deleted: false,
        parentOffering: root,
      };
      const grade = {
        id: 100,
        displayName: 'Class 4',
        level: 2,
        deleted: false,
        parentOffering: board,
      };
      const subject = {
        id: 1000,
        displayName: 'Mathematics',
        level: 3,
        deleted: false,
        parentOffering: grade,
      };

      proficiencyTestService.findAllForAdmin.mockResolvedValue([
        {
          id: 5,
          offerings: [subject],
          questionCount: 42,
        },
      ]);
      offeringService.findAll.mockResolvedValue([root, board, grade, subject]);

      const items = await service.listProficiencyTests();

      expect(items).toEqual([
        {
          id: 5,
          studyArea: 'School Education',
          board: 'CBSE',
          classLabel: 'Class 4',
          subjects: 'Mathematics',
          questionCount: 42,
          offeringIds: [1000],
        },
      ]);
    });
  });

  describe('getProficiencyTestDetail', () => {
    it('returns full test with questions from proficiency service', async () => {
      const testDetail = { id: 9, name: 'Math PT', questions: [{ id: 1 }] };
      proficiencyTestService.getTestWithAllQuestionsForAdmin.mockResolvedValue(
        testDetail,
      );

      await expect(service.getProficiencyTestDetail(9)).resolves.toEqual(
        testDetail,
      );
      expect(
        proficiencyTestService.getTestWithAllQuestionsForAdmin,
      ).toHaveBeenCalledWith(9);
    });
  });
});
