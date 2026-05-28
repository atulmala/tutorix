import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentScreeningEntity } from '../entities/document-screening.entity';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import { DocumentScreeningStatusEnum } from '../enums/document-screening-status.enum';
import { TutorOnboardingDocumentEligibilityService } from './tutor-onboarding-document-eligibility.service';

describe('TutorOnboardingDocumentEligibilityService', () => {
  let service: TutorOnboardingDocumentEligibilityService;

  const documentRepo = {
    find: jest.fn(),
  };
  const screeningRepo = {
    findOne: jest.fn(),
  };
  const tutorRepo = {
    manager: {
      createQueryBuilder: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorOnboardingDocumentEligibilityService,
        { provide: getRepositoryToken(DocumentEntity), useValue: documentRepo },
        {
          provide: getRepositoryToken(DocumentScreeningEntity),
          useValue: screeningRepo,
        },
        { provide: getRepositoryToken(Tutor), useValue: tutorRepo },
      ],
    }).compile();

    service = module.get(TutorOnboardingDocumentEligibilityService);

    const qb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    tutorRepo.manager.createQueryBuilder.mockReturnValue(qb);
  });

  it('fails when a required document type is missing', async () => {
    documentRepo.find.mockResolvedValue([
      {
        id: 1,
        tutorId: 10,
        documentType: DocumentTypeEnum.AADHAAR_CARD,
        storageKey: 'k1',
        deleted: false,
      },
    ]);
    screeningRepo.findOne.mockResolvedValue({
      status: DocumentScreeningStatusEnum.PASSED_AUTOMATED,
    });

    const result = await service.evaluateTutorOnboardingDocuments(10);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('four');
  });

  it('passes when all four types have passed screening and no human pending', async () => {
    const docs = [
      DocumentTypeEnum.AADHAAR_CARD,
      DocumentTypeEnum.PAN_CARD,
      DocumentTypeEnum.CLASS_XII_MARKSHEET,
      DocumentTypeEnum.HIGHEST_DEGREE_CERTIFICATE,
    ].map((documentType, index) => ({
      id: index + 1,
      tutorId: 10,
      documentType,
      storageKey: `k${index}`,
      deleted: false,
    }));
    documentRepo.find.mockResolvedValue(docs);
    screeningRepo.findOne.mockResolvedValue({
      status: DocumentScreeningStatusEnum.PASSED_AUTOMATED,
    });

    const result = await service.evaluateTutorOnboardingDocuments(10);
    expect(result).toEqual({ passed: true });
  });
});
