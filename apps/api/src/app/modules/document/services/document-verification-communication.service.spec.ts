import { DocumentVerificationCommunicationService } from './document-verification-communication.service';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import { DocumentScreeningStatusEnum } from '../enums/document-screening-status.enum';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { ONBOARDING_DOCUMENT_TYPES } from '../onboarding-document-types';

describe('DocumentVerificationCommunicationService', () => {
  const tutorId = 4;
  const userId = 11;

  function createService(args: {
    documents: Array<{
      id: number;
      documentType: DocumentTypeEnum;
      storageKey?: string;
      name?: string;
    }>;
    screenings: Array<{
      documentId: number;
      status: DocumentScreeningStatusEnum;
      reviewerNote?: string;
      summaryNotes?: string;
    }>;
  }) {
    const emit = jest.fn().mockResolvedValue(undefined);
    const service = new DocumentVerificationCommunicationService(
      {
        find: jest.fn().mockResolvedValue(args.documents),
      } as never,
      {
        find: jest.fn().mockResolvedValue(args.screenings),
      } as never,
      {
        findOne: jest.fn().mockResolvedValue({ id: tutorId, userId }),
      } as never,
      {
        findOne: jest.fn().mockResolvedValue({ id: userId, firstName: 'Ada' }),
      } as never,
      { emit } as never,
    );
    return { service, emit };
  }

  function fourDocs() {
    return ONBOARDING_DOCUMENT_TYPES.map((type, index) => ({
      id: index + 1,
      documentType: type,
      storageKey: `key-${index + 1}`,
      name: `Doc ${index + 1}`,
    }));
  }

  it('emits all-uploaded when every required type has a file', async () => {
    const { service, emit } = createService({
      documents: fourDocs(),
      screenings: [],
    });
    await service.notifyIfAllUploadedAsync(tutorId);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        event: CommunicationEvent.DOCUMENTS_ALL_UPLOADED,
        userId,
        entityType: 'tutor-docs-uploaded',
        payload: { firstName: 'Ada' },
      }),
    );
  });

  it('does not emit all-uploaded when a required type is missing', async () => {
    const { service, emit } = createService({
      documents: fourDocs().slice(0, 3),
      screenings: [],
    });
    await service.notifyIfAllUploadedAsync(tutorId);
    expect(emit).not.toHaveBeenCalled();
  });

  it('does not emit pass/fail while a document is still pending human review', async () => {
    const docs = fourDocs();
    const { service, emit } = createService({
      documents: docs,
      screenings: docs.map((doc, index) => ({
        documentId: doc.id,
        status:
          index === 0
            ? DocumentScreeningStatusEnum.PENDING_HUMAN
            : DocumentScreeningStatusEnum.PASSED_AUTOMATED,
      })),
    });
    await service.notifyIfVerificationCompleteAsync(tutorId);
    expect(emit).not.toHaveBeenCalled();
  });

  it('emits passed once all documents have a final passing status', async () => {
    const docs = fourDocs();
    const { service, emit } = createService({
      documents: docs,
      screenings: docs.map((doc) => ({
        documentId: doc.id,
        status: DocumentScreeningStatusEnum.PASSED_AUTOMATED,
      })),
    });
    await service.notifyIfVerificationCompleteAsync(tutorId);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        event: CommunicationEvent.DOCUMENTS_VERIFICATION_PASSED,
        entityType: 'tutor-docs-outcome',
      }),
    );
  });

  it('emits failed with a pre-rendered document list', async () => {
    const docs = fourDocs();
    const { service, emit } = createService({
      documents: docs,
      screenings: [
        {
          documentId: 1,
          status: DocumentScreeningStatusEnum.REJECTED_HUMAN,
          reviewerNote: 'Name does not match',
        },
        {
          documentId: 2,
          status: DocumentScreeningStatusEnum.PASSED_AUTOMATED,
        },
        {
          documentId: 3,
          status: DocumentScreeningStatusEnum.APPROVED_HUMAN,
        },
        {
          documentId: 4,
          status: DocumentScreeningStatusEnum.PASSED_AUTOMATED,
        },
      ],
    });
    await service.notifyIfVerificationCompleteAsync(tutorId);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        event: CommunicationEvent.DOCUMENTS_VERIFICATION_FAILED,
        payload: expect.objectContaining({
          firstName: 'Ada',
          failedCount: '1',
          failedDocumentsText: expect.stringContaining('Name does not match'),
          failedDocumentsHtml: expect.stringContaining('Name does not match'),
        }),
      }),
    );
  });
});
