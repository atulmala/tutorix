jest.mock('../../document/document-image-media', () => ({
  buildTutorDocumentImageMediaPatch: jest.fn(),
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TutorDetailService } from './tutor-detail.service';
import { TutorService } from './tutor.service';
import { TutorQualificationService } from './tutor-qualification.service';
import { ExperienceService } from '../../experience/services/experience.service';
import { TutorOfferingService } from './tutor-offering.service';
import { DocumentService } from '../../document/services/document.service';
import { DocumentScreeningService } from '../../document/services/document-screening.service';
import { UserBankDetailsService } from '../../user-bank-details/services/user-bank-details.service';
import { UserRole } from '../../auth/enums/user-role.enum';
import { TutorCertificationStageEnum } from '../enums/tutor.enums';
import { YearsOfExperienceEnum } from '../enums/years-of-experience.enum';
import { TutorOfferingStatusEnum } from '../enums/tutor.enums';
import { DocumentTypeEnum } from '../../document/enums/document-type.enum';
import { DocumentScreeningStatusEnum } from '../../document/enums/document-screening-status.enum';

describe('TutorDetailService', () => {
  let service: TutorDetailService;
  let tutorService: {
    findOneWithProfile: jest.Mock;
    findByUserId: jest.Mock;
  };
  let tutorQualificationService: { findByTutorId: jest.Mock };
  let experienceService: { findByTutorId: jest.Mock };
  let tutorOfferingService: { findByTutorId: jest.Mock };
  let documentService: {
    findOnboardingDocumentsByTutorId: jest.Mock;
    resolvePreviewUrlForAdmin: jest.Mock;
    resolveViewUrlForAdmin: jest.Mock;
  };
  let documentScreeningService: { findByDocumentIds: jest.Mock };
  let userBankDetailsService: {
    findByUserId: jest.Mock;
    mapToGraphql: jest.Mock;
  };

  beforeEach(async () => {
    tutorService = {
      findOneWithProfile: jest.fn(),
      findByUserId: jest.fn(),
    };
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
    };
    userBankDetailsService = {
      findByUserId: jest.fn().mockResolvedValue(null),
      mapToGraphql: jest.fn().mockReturnValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorDetailService,
        { provide: TutorService, useValue: tutorService },
        { provide: TutorQualificationService, useValue: tutorQualificationService },
        { provide: ExperienceService, useValue: experienceService },
        { provide: TutorOfferingService, useValue: tutorOfferingService },
        { provide: DocumentService, useValue: documentService },
        { provide: DocumentScreeningService, useValue: documentScreeningService },
        { provide: UserBankDetailsService, useValue: userBankDetailsService },
      ],
    }).compile();

    service = module.get(TutorDetailService);
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
          id: 99,
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
      userBankDetailsService.findByUserId.mockResolvedValue({
        bankName: 'HDFC Bank',
        accountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
        gstNumber: null,
      });
      userBankDetailsService.mapToGraphql.mockReturnValue({
        bankName: 'HDFC Bank',
        ifscCode: 'HDFC0001234',
        panNumber: 'ABCDE1234F',
        accountNumberMasked: 'xxxxxxxx9012',
        isComplete: true,
        fullAccountNumber: '123456789012',
      });

      const detail = await service.getTutorDetail(7);

      expect(detail).toMatchObject({
        id: 7,
        user: {
          firstName: 'Jane',
          lastName: 'Tutor',
          email: 'jane@example.com',
          createdDate: registrationDate,
          bankDetails: {
            bankName: 'HDFC Bank',
            ifscCode: 'HDFC0001234',
            panNumber: 'ABCDE1234F',
            accountNumberMasked: 'xxxxxxxx9012',
            isComplete: true,
            fullAccountNumber: '123456789012',
          },
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
      expect(userBankDetailsService.findByUserId).toHaveBeenCalledWith(99);
    });
  });

  describe('getMyTutorDetail', () => {
    const tutorUser = {
      id: 1,
      role: UserRole.TUTOR,
    };

    it('returns detail when onboarding complete and celebration seen', async () => {
      tutorService.findByUserId.mockResolvedValue({
        id: 7,
        onBoardingComplete: true,
        onboardingCelebrationSeen: true,
      });
      tutorService.findOneWithProfile.mockResolvedValue({
        id: 7,
        yearsOfExperience: YearsOfExperienceEnum.ZERO_TO_TWO,
        regFeePaid: true,
        user: { firstName: 'Jane', lastName: 'Tutor' },
        addresses: [],
      });

      const detail = await service.getMyTutorDetail(tutorUser as never);

      expect(detail.id).toBe(7);
      expect(tutorService.findByUserId).toHaveBeenCalledWith(1);
    });

    it('rejects non-tutor users', async () => {
      await expect(
        service.getMyTutorDetail({ id: 2, role: UserRole.STUDENT } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when tutor profile missing', async () => {
      tutorService.findByUserId.mockResolvedValue(null);

      await expect(service.getMyTutorDetail(tutorUser as never)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects when onboarding not complete', async () => {
      tutorService.findByUserId.mockResolvedValue({
        id: 7,
        onBoardingComplete: false,
        onboardingCelebrationSeen: true,
      });

      await expect(service.getMyTutorDetail(tutorUser as never)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects when celebration not acknowledged', async () => {
      tutorService.findByUserId.mockResolvedValue({
        id: 7,
        onBoardingComplete: true,
        onboardingCelebrationSeen: false,
      });

      await expect(service.getMyTutorDetail(tutorUser as never)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
