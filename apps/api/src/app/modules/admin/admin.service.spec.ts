import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { User } from '../auth/entities/user.entity';
import { Tutor } from '../tutor/entities/tutor.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { TutorCertificationStageEnum } from '../tutor/enums/tutor.enums';

function createQueryBuilderMock() {
  const qb: Record<string, jest.Mock> = {
    innerJoinAndSelect: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
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

  beforeEach(async () => {
    userCount = jest.fn();
    tutorRepo = { createQueryBuilder: jest.fn() };

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
    });
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
  });

  describe('getTutorStageCounts', () => {
    it('returns grouped stage counts', async () => {
      const qb = createQueryBuilderMock();
      qb.getRawMany.mockResolvedValue([
        { stage: 'address', count: '12' },
        { stage: 'docs', count: '3' },
      ]);
      tutorRepo.createQueryBuilder.mockReturnValue(qb);

      const counts = await service.getTutorStageCounts();

      expect(qb.groupBy).toHaveBeenCalledWith('tutor.certificationStage');
      expect(counts).toEqual([
        { stage: TutorCertificationStageEnum.address, count: 12 },
        { stage: TutorCertificationStageEnum.docs, count: 3 },
      ]);
    });
  });
});
