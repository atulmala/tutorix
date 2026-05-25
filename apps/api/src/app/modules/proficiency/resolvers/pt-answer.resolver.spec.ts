import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole } from '../../auth/enums/user-role.enum';
import { User } from '../../auth/entities/user.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { PtAnswerEntity } from '../entities/pt-answer.entity';
import { PtAnswerResolver } from './pt-answer.resolver';

describe('PtAnswerResolver', () => {
  let resolver: PtAnswerResolver;
  let findOne: jest.Mock;

  const correctAnswer = { answer: true } as PtAnswerEntity;
  const wrongAnswer = { answer: false } as PtAnswerEntity;

  beforeEach(async () => {
    findOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PtAnswerResolver,
        {
          provide: getRepositoryToken(Tutor),
          useValue: { findOne },
        },
      ],
    }).compile();

    resolver = module.get(PtAnswerResolver);
  });

  it('returns false when user is not authenticated', async () => {
    await expect(
      resolver.answer(correctAnswer, { req: {} }),
    ).resolves.toBe(false);
  });

  it('returns stored answer for admin users', async () => {
    const admin = { id: 1, role: UserRole.ADMIN } as User;

    await expect(
      resolver.answer(correctAnswer, { req: { user: admin } }),
    ).resolves.toBe(true);
    await expect(
      resolver.answer(wrongAnswer, { req: { user: admin } }),
    ).resolves.toBe(false);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('returns stored answer for test tutors', async () => {
    const tutorUser = { id: 2, role: UserRole.TUTOR } as User;
    findOne.mockResolvedValue({ id: 10, testTutor: true });

    await expect(
      resolver.answer(correctAnswer, { req: { user: tutorUser } }),
    ).resolves.toBe(true);
    expect(findOne).toHaveBeenCalledWith({
      where: { userId: 2, deleted: false },
    });
  });

  it('returns false for regular tutors', async () => {
    const tutorUser = { id: 3, role: UserRole.TUTOR } as User;
    findOne.mockResolvedValue({ id: 11, testTutor: false });

    await expect(
      resolver.answer(correctAnswer, { req: { user: tutorUser } }),
    ).resolves.toBe(false);
  });
});
