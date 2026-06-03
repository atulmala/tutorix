import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TutorOfferingEntity } from '../entities/tutor-offering.entity';
import {
  TutorCertificationStageEnum,
  TutorOfferingStatusEnum,
} from '../enums/tutor.enums';
import { ProficiencyTestService } from '../../proficiency/services/proficiency-test.service';
import { TutorService } from './tutor.service';
import { TutorOfferingPtFeeService } from './tutor-offering-pt-fee.service';
import { TutorOfferingService } from './tutor-offering.service';

describe('TutorOfferingService', () => {
  let service: TutorOfferingService;
  let tutorOfferingSave: jest.Mock;
  let updateCertificationStage: jest.Mock;
  let tutorOfferingFindOne: jest.Mock;
  let getTestWithQuestionsForTaker: jest.Mock;
  let assertCanTakeProficiencyTest: jest.Mock;
  let tutorFindOne: jest.Mock;

  beforeEach(async () => {
    tutorOfferingSave = jest.fn().mockImplementation((entity) => Promise.resolve(entity));
    updateCertificationStage = jest.fn();
    assertCanTakeProficiencyTest = jest.fn();
    tutorFindOne = jest.fn().mockResolvedValue({
      id: 10,
      certificationStage: TutorCertificationStageEnum.pt,
    });

    tutorOfferingFindOne = jest.fn().mockResolvedValue({
      id: 1,
      tutorId: 10,
      proficiencyTestId: 7,
      status: TutorOfferingStatusEnum.pending_pt,
      attemptsUsed: 0,
      isInitialOnboarding: false,
    });

    getTestWithQuestionsForTaker = jest.fn().mockResolvedValue({
      score: 2,
      passPercentage: 50,
      questions: [
        {
          id: 1,
          answers: [
            { id: 10, answer: true },
            { id: 11, answer: false },
          ],
        },
        {
          id: 2,
          answers: [
            { id: 20, answer: true },
            { id: 21, answer: false },
          ],
        },
      ],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorOfferingService,
        {
          provide: getRepositoryToken(TutorOfferingEntity),
          useValue: {
            findOne: tutorOfferingFindOne,
            save: tutorOfferingSave,
            create: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: ProficiencyTestService,
          useValue: {
            getTestForOffering: jest.fn(),
            getTestWithQuestionsForTaker,
          },
        },
        {
          provide: TutorService,
          useValue: {
            findOne: tutorFindOne,
            updateCertificationStage,
          },
        },
        {
          provide: TutorOfferingPtFeeService,
          useValue: { assertCanTakeProficiencyTest },
        },
      ],
    }).compile();

    service = module.get(TutorOfferingService);
  });

  it('does not advance certification stage after post-onboarding PT pass', async () => {
    const result = await service.submitProficiencyTest(10, {
      tutorOfferingId: 1,
      answers: [
        { questionId: 1, answerId: 10 },
        { questionId: 2, answerId: 20 },
      ],
      timeTakenSeconds: 60,
    });

    expect(result.passed).toBe(true);
    expect(updateCertificationStage).not.toHaveBeenCalled();
    expect(tutorOfferingSave).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TutorOfferingStatusEnum.pt_passed,
      }),
    );
  });

  it('advances certification stage when initial onboarding PT passes at pt stage', async () => {
    tutorOfferingFindOne.mockResolvedValue({
      id: 2,
      tutorId: 10,
      proficiencyTestId: 7,
      status: TutorOfferingStatusEnum.pending_pt,
      attemptsUsed: 0,
      isInitialOnboarding: true,
    });

    await service.submitProficiencyTest(10, {
      tutorOfferingId: 2,
      answers: [
        { questionId: 1, answerId: 10 },
        { questionId: 2, answerId: 20 },
      ],
      timeTakenSeconds: 60,
    });

    expect(updateCertificationStage).toHaveBeenCalledWith(
      10,
      TutorCertificationStageEnum.registrationPayment,
    );
  });
});
