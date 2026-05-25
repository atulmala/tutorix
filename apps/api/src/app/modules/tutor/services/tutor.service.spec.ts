import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TutorService } from './tutor.service';
import { Tutor } from '../entities/tutor.entity';

describe('TutorService', () => {
  let service: TutorService;
  let findOne: jest.Mock;
  let save: jest.Mock;

  beforeEach(async () => {
    findOne = jest.fn();
    save = jest.fn().mockImplementation((tutor) => Promise.resolve(tutor));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorService,
        {
          provide: getRepositoryToken(Tutor),
          useValue: {
            findOne,
            save,
          },
        },
      ],
    }).compile();

    service = module.get(TutorService);
  });

  describe('updateTestTutor', () => {
    it('persists the test tutor flag', async () => {
      const tutor = { id: 3, testTutor: false } as Tutor;
      findOne.mockResolvedValue(tutor);

      const result = await service.updateTestTutor(3, true);

      expect(result.testTutor).toBe(true);
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ testTutor: true }));
    });
  });
});
