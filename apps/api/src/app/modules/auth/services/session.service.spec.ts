import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionService } from './session.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { UserRole } from '../enums/user-role.enum';
import { SessionPlatform } from '../enums/session-platform.enum';

function createQueryBuilderMock(getRawOneResult: { userCount: string; sessionCount: string }) {
  const qb: Record<string, jest.Mock> = {
    innerJoin: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    getRawOne: jest.fn().mockResolvedValue(getRawOneResult),
  };
  for (const key of Object.keys(qb)) {
    if (key !== 'getRawOne') {
      qb[key].mockReturnValue(qb);
    }
  }
  return qb;
}

describe('SessionService', () => {
  let service: SessionService;
  let refreshTokenRepo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    refreshTokenRepo = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepo,
        },
      ],
    }).compile();

    service = module.get(SessionService);
  });

  describe('getActiveSessionStatsByRole', () => {
    it('returns unique users and session counts per role, excluding admin platform', async () => {
      const tutorQb = createQueryBuilderMock({ userCount: '3', sessionCount: '5' });
      const studentQb = createQueryBuilderMock({ userCount: '7', sessionCount: '8' });
      refreshTokenRepo.createQueryBuilder
        .mockReturnValueOnce(tutorQb)
        .mockReturnValueOnce(studentQb);

      const stats = await service.getActiveSessionStatsByRole();

      expect(stats).toEqual({
        tutorOnlineUsers: 3,
        studentOnlineUsers: 7,
        tutorActiveSessions: 5,
        studentActiveSessions: 8,
      });
      expect(tutorQb.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: UserRole.TUTOR,
      });
      expect(tutorQb.andWhere).toHaveBeenCalledWith(
        '(rt.platform IS NULL OR rt.platform <> :adminPlatform)',
        { adminPlatform: SessionPlatform.admin },
      );
      expect(tutorQb.andWhere).toHaveBeenCalledWith(
        '(COALESCE(rt.lastActivityAt, rt.createdDate) >= :threshold)',
        expect.objectContaining({ threshold: expect.any(Date) }),
      );
    });
  });
});
