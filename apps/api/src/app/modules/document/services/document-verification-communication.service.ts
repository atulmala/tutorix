import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CommunicationService } from '../../communication/communication.service';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { User } from '../../auth/entities/user.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentScreeningEntity } from '../entities/document-screening.entity';
import { DocumentScreeningStatusEnum } from '../enums/document-screening-status.enum';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import {
  ONBOARDING_DOCUMENT_DISPLAY_NAMES,
  ONBOARDING_DOCUMENT_TYPES,
} from '../onboarding-document-types';
import { formatFailedDocuments } from '../failed-documents-copy';

const FINAL_STATUSES = new Set<DocumentScreeningStatusEnum>([
  DocumentScreeningStatusEnum.PASSED_AUTOMATED,
  DocumentScreeningStatusEnum.APPROVED_HUMAN,
  DocumentScreeningStatusEnum.REJECTED_HUMAN,
]);

type OnboardingSlot = {
  type: DocumentTypeEnum;
  document: DocumentEntity;
  screening: DocumentScreeningEntity | null;
};

type OnboardingSnapshot = {
  tutorId: number;
  userId: number;
  firstName: string;
  slots: OnboardingSlot[];
};

@Injectable()
export class DocumentVerificationCommunicationService {
  private readonly logger = new Logger(
    DocumentVerificationCommunicationService.name,
  );

  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(DocumentScreeningEntity)
    private readonly screeningRepo: Repository<DocumentScreeningEntity>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly communicationService: CommunicationService,
  ) {}

  notifyIfAllUploaded(tutorId: number): void {
    void this.notifyIfAllUploadedAsync(tutorId).catch((error: unknown) => {
      this.logEmitError('DOCUMENTS_ALL_UPLOADED', error);
    });
  }

  notifyIfVerificationComplete(tutorId: number): void {
    void this.notifyIfVerificationCompleteAsync(tutorId).catch(
      (error: unknown) => {
        this.logEmitError('DOCUMENTS_VERIFICATION', error);
      },
    );
  }

  async notifyIfAllUploadedAsync(tutorId: number): Promise<void> {
    const snapshot = await this.loadOnboardingSnapshot(tutorId);
    if (!snapshot) {
      return;
    }
    await this.communicationService.emit({
      event: CommunicationEvent.DOCUMENTS_ALL_UPLOADED,
      userId: snapshot.userId,
      entityType: 'tutor-docs-uploaded',
      entityId: `${tutorId}:${snapshot.slots.map((slot) => slot.document.id).join('-')}`,
      payload: { firstName: snapshot.firstName },
    });
  }

  async notifyIfVerificationCompleteAsync(tutorId: number): Promise<void> {
    const snapshot = await this.loadOnboardingSnapshot(tutorId);
    if (!snapshot) {
      return;
    }
    if (
      !snapshot.slots.every(
        (slot) => slot.screening && FINAL_STATUSES.has(slot.screening.status),
      )
    ) {
      return;
    }

    const rejected = snapshot.slots.filter(
      (slot) =>
        slot.screening?.status === DocumentScreeningStatusEnum.REJECTED_HUMAN,
    );
    const fingerprint = snapshot.slots
      .map((slot) => `${slot.document.id}:${slot.screening?.status}`)
      .join(',');

    if (rejected.length > 0) {
      const formatted = formatFailedDocuments(
        rejected.map((slot) => ({
          label:
            ONBOARDING_DOCUMENT_DISPLAY_NAMES[slot.type] ??
            slot.document.name ??
            'Document',
          reason:
            slot.screening?.reviewerNote?.trim() ||
            slot.screening?.summaryNotes?.trim() ||
            'Not accepted',
        })),
      );
      await this.communicationService.emit({
        event: CommunicationEvent.DOCUMENTS_VERIFICATION_FAILED,
        userId: snapshot.userId,
        entityType: 'tutor-docs-outcome',
        entityId: `${tutorId}:${fingerprint}`,
        payload: {
          firstName: snapshot.firstName,
          ...formatted,
        },
      });
      return;
    }

    await this.communicationService.emit({
      event: CommunicationEvent.DOCUMENTS_VERIFICATION_PASSED,
      userId: snapshot.userId,
      entityType: 'tutor-docs-outcome',
      entityId: `${tutorId}:${fingerprint}`,
      payload: { firstName: snapshot.firstName },
    });
  }

  private async loadOnboardingSnapshot(
    tutorId: number,
  ): Promise<OnboardingSnapshot | null> {
    const tutor = await this.tutorRepo.findOne({
      where: { id: tutorId, deleted: false },
    });
    if (!tutor) {
      return null;
    }
    const user = await this.userRepo.findOne({
      where: { id: tutor.userId, deleted: false },
      select: ['id', 'firstName'],
    });
    if (!user) {
      return null;
    }

    const documents = await this.documentRepo.find({
      where: {
        tutorId,
        deleted: false,
        documentType: In([...ONBOARDING_DOCUMENT_TYPES]),
      },
      order: { id: 'DESC' },
    });

    const latestByType = new Map<DocumentTypeEnum, DocumentEntity>();
    for (const document of documents) {
      if (!document.storageKey) {
        continue;
      }
      if (!latestByType.has(document.documentType)) {
        latestByType.set(document.documentType, document);
      }
    }

    const slots: OnboardingSlot[] = [];
    for (const type of ONBOARDING_DOCUMENT_TYPES) {
      const document = latestByType.get(type);
      if (!document) {
        return null;
      }
      slots.push({ type, document, screening: null });
    }

    const screenings = await this.screeningRepo.find({
      where: { documentId: In(slots.map((slot) => slot.document.id)) },
    });
    const screeningByDocId = new Map(
      screenings.map((row) => [row.documentId, row]),
    );
    for (const slot of slots) {
      slot.screening = screeningByDocId.get(slot.document.id) ?? null;
    }

    return {
      tutorId,
      userId: user.id,
      firstName: user.firstName?.trim() || 'there',
      slots,
    };
  }

  private logEmitError(event: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${event} emit failed: ${message}`);
  }
}
