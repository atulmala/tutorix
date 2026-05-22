import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  DocumentScreeningBatchService,
  formatExpectedOwnerName,
} from './document-screening-batch.service';
import { DocumentScreeningAiService } from './document-screening-ai.service';
import { BatchJobRunService } from '../../../batch-jobs/services/batch-job-run.service';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentScreeningEntity } from '../entities/document-screening.entity';
import { User } from '../../auth/entities/user.entity';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import { DocumentVerificationWorkflowStatusEnum } from '../enums/document-verification-workflow-status.enum';
import { DocumentScreeningStatusEnum } from '../enums/document-screening-status.enum';

describe('DocumentScreeningBatchService', () => {
  let service: DocumentScreeningBatchService;
  let documentCreateQueryBuilder: jest.Mock;
  let documentSave: jest.Mock;
  let screeningSave: jest.Mock;
  let userFindOne: jest.Mock;
  let userCreateQueryBuilder: jest.Mock;
  let screenDocument: jest.Mock;
  let startRun: jest.Mock;
  let finishRun: jest.Mock;
  let failRun: jest.Mock;

  beforeEach(async () => {
    documentCreateQueryBuilder = jest.fn();
    documentSave = jest.fn();
    screeningSave = jest.fn();
    userFindOne = jest.fn();
    userCreateQueryBuilder = jest.fn();
    screenDocument = jest.fn();
    startRun = jest.fn().mockResolvedValue({ id: 99 });
    finishRun = jest.fn().mockResolvedValue(undefined);
    failRun = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentScreeningBatchService,
        {
          provide: BatchJobRunService,
          useValue: { startRun, finishRun, failRun },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'S3_DOCUMENTS_BUCKET') return 'test-bucket';
              if (key === 'AWS_REGION') return 'us-east-1';
              return undefined;
            }),
          },
        },
        {
          provide: DocumentScreeningAiService,
          useValue: { screenDocument },
        },
        {
          provide: getRepositoryToken(DocumentEntity),
          useValue: {
            createQueryBuilder: documentCreateQueryBuilder,
            save: documentSave,
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DocumentScreeningEntity),
          useValue: {
            create: jest
              .fn()
              .mockImplementation((data) => data as DocumentScreeningEntity),
            save: screeningSave,
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: userFindOne,
            createQueryBuilder: userCreateQueryBuilder,
          },
        },
      ],
    }).compile();

    service = module.get(DocumentScreeningBatchService);
  });

  describe('formatExpectedOwnerName', () => {
    it('joins first and last name', () => {
      expect(
        formatExpectedOwnerName({ firstName: 'Rahul', lastName: 'Sharma' }),
      ).toBe('Rahul Sharma');
    });

    it('returns empty string when both names missing', () => {
      expect(formatExpectedOwnerName({ firstName: undefined, lastName: undefined })).toBe(
        '',
      );
    });
  });

  describe('findPendingDocuments', () => {
    it('builds query with onboarding filters', async () => {
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      documentCreateQueryBuilder.mockReturnValue(qb as never);

      await service.findPendingDocuments(10);

      expect(documentCreateQueryBuilder).toHaveBeenCalledWith('d');
      expect(qb.where).toHaveBeenCalledWith('d.verified = :verified', {
        verified: false,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'd.document_verification_workflow_status = :status',
        { status: DocumentVerificationWorkflowStatusEnum.PENDING },
      );
      expect(qb.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('processDocument', () => {
    it('queues for human when tutor name cannot be resolved', async () => {
      userFindOne.mockResolvedValue(null);
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userCreateQueryBuilder.mockReturnValue(qb as never);

      const document = {
        id: 1,
        tutorId: 2,
        userId: 3,
        storageKey: 'tutors/2/onboarding/PAN_CARD/x.pdf',
        documentType: DocumentTypeEnum.PAN_CARD,
        verificationWorkflowStatus: DocumentVerificationWorkflowStatusEnum.PENDING,
      } as DocumentEntity;

      await service.processDocument(document, 99);

      expect(screeningSave).toHaveBeenCalledWith(
        expect.objectContaining({
          batchJobRunId: 99,
          status: DocumentScreeningStatusEnum.PENDING_HUMAN,
          summaryNotes: 'Could not resolve tutor name for verification.',
        }),
      );
      expect(documentSave).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationWorkflowStatus: DocumentVerificationWorkflowStatusEnum.COMPLETED,
        }),
      );
      expect(screenDocument).not.toHaveBeenCalled();
    });

    it('persists AI token usage when screening succeeds', async () => {
      userFindOne.mockResolvedValue({
        id: 3,
        firstName: 'Rahul',
        lastName: 'Sharma',
      });

      const document = {
        id: 1,
        tutorId: 2,
        userId: 3,
        storageKey: 'tutors/2/onboarding/PAN_CARD/x.pdf',
        mimeType: 'application/pdf',
        documentType: DocumentTypeEnum.PAN_CARD,
        verificationWorkflowStatus: DocumentVerificationWorkflowStatusEnum.PENDING,
      } as DocumentEntity;

      screenDocument.mockResolvedValue({
        status: DocumentScreeningStatusEnum.PASSED_AUTOMATED,
        confidence: 0.95,
        summaryNotes: 'PAN layout and holder name match the registered tutor.',
        modelId: 'claude-sonnet-4-6',
        usage: {
          inputTokens: 1200,
          outputTokens: 40,
          cacheCreationInputTokens: 1100,
          cacheReadInputTokens: 0,
        },
      });

      jest
        .spyOn(
          service as unknown as {
            fetchDocumentBytes: (key: string) => Promise<Buffer>;
          },
          'fetchDocumentBytes',
        )
        .mockResolvedValue(Buffer.from('pdf'));

      await service.processDocument(document, 99);

      expect(screeningSave).toHaveBeenCalledWith(
        expect.objectContaining({
          aiInputTokens: 1200,
          aiOutputTokens: 40,
          aiCacheCreationInputTokens: 1100,
          aiCacheReadInputTokens: 0,
        }),
      );
    });
  });

  describe('runBatch', () => {
    it('records audit run when documents are found', async () => {
      const documents = [
        {
          id: 1,
          tutorId: 2,
          userId: 3,
          storageKey: 'tutors/2/onboarding/PAN_CARD/x.pdf',
          documentType: DocumentTypeEnum.PAN_CARD,
          verificationWorkflowStatus: DocumentVerificationWorkflowStatusEnum.PENDING,
        },
      ] as DocumentEntity[];

      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(documents),
      };
      documentCreateQueryBuilder.mockReturnValue(qb as never);
      userFindOne.mockResolvedValue(null);
      const userQb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userCreateQueryBuilder.mockReturnValue(userQb as never);

      const result = await service.runBatch(10);

      expect(startRun).toHaveBeenCalled();
      expect(finishRun).toHaveBeenCalledWith(
        99,
        expect.objectContaining({
          itemsFound: 1,
          itemsProcessed: 1,
          itemsSkipped: 0,
          itemsFailed: 0,
        }),
        expect.objectContaining({
          aiTokenUsage: expect.objectContaining({
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          }),
        }),
      );
      expect(result.batchJobRunId).toBe(99);
    });

    it('does not create audit run when no documents pending', async () => {
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      documentCreateQueryBuilder.mockReturnValue(qb as never);

      const result = await service.runBatch(10);

      expect(startRun).not.toHaveBeenCalled();
      expect(finishRun).not.toHaveBeenCalled();
      expect(result).toEqual({ processed: 0, skipped: 0 });
    });
  });
});
