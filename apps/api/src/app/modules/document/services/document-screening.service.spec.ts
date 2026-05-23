import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentScreeningService } from './document-screening.service';
import { DocumentService } from './document.service';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentScreeningEntity } from '../entities/document-screening.entity';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import { DocumentScreeningStatusEnum } from '../enums/document-screening-status.enum';

jest.mock('../document-image-media', () => ({
  buildTutorDocumentImageMediaPatch: jest.fn(),
}));

describe('DocumentScreeningService', () => {
  let service: DocumentScreeningService;
  let screeningFindOne: jest.Mock;
  let screeningSave: jest.Mock;
  let documentSave: jest.Mock;
  let findDocumentById: jest.Mock;

  beforeEach(async () => {
    screeningFindOne = jest.fn();
    screeningSave = jest.fn().mockImplementation((row) => Promise.resolve(row));
    documentSave = jest.fn().mockImplementation((row) => Promise.resolve(row));
    findDocumentById = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentScreeningService,
        {
          provide: getRepositoryToken(DocumentScreeningEntity),
          useValue: {
            findOne: screeningFindOne,
            save: screeningSave,
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DocumentEntity),
          useValue: { save: documentSave },
        },
        {
          provide: DocumentService,
          useValue: { findDocumentById },
        },
      ],
    }).compile();

    service = module.get(DocumentScreeningService);
  });

  it('approves a pending human review document', async () => {
    const document = {
      id: 5,
      documentType: DocumentTypeEnum.PAN_CARD,
      verified: false,
    } as DocumentEntity;
    const screening = {
      documentId: 5,
      status: DocumentScreeningStatusEnum.PENDING_HUMAN,
    } as DocumentScreeningEntity;

    findDocumentById
      .mockResolvedValueOnce(document)
      .mockResolvedValueOnce({ ...document, verified: true });
    screeningFindOne.mockResolvedValue(screening);

    const result = await service.reviewByAdmin(5, true, 99, 'Looks good');

    expect(screeningSave).toHaveBeenCalledWith(
      expect.objectContaining({
        status: DocumentScreeningStatusEnum.APPROVED_HUMAN,
        reviewedByUserId: 99,
        reviewerNote: 'Looks good',
      }),
    );
    expect(documentSave).toHaveBeenCalledWith(
      expect.objectContaining({ verified: true }),
    );
    expect(result.screening.status).toBe(DocumentScreeningStatusEnum.APPROVED_HUMAN);
  });

  it('rejects documents that are not pending human review', async () => {
    findDocumentById.mockResolvedValue({
      id: 5,
      documentType: DocumentTypeEnum.PAN_CARD,
    });
    screeningFindOne.mockResolvedValue({
      documentId: 5,
      status: DocumentScreeningStatusEnum.PASSED_AUTOMATED,
    });

    await expect(service.reviewByAdmin(5, true, 99)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when screening record is missing', async () => {
    findDocumentById.mockResolvedValue({
      id: 5,
      documentType: DocumentTypeEnum.PAN_CARD,
    });
    screeningFindOne.mockResolvedValue(null);

    await expect(service.reviewByAdmin(5, true, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
