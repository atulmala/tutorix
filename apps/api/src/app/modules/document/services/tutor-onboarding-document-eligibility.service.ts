import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { findTutorIdsWithPendingDocumentReview } from '../../admin/admin-tutor.utils';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentScreeningEntity } from '../entities/document-screening.entity';
import { DocumentScreeningStatusEnum } from '../enums/document-screening-status.enum';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import { ONBOARDING_DOCUMENT_TYPES } from '../onboarding-document-types';

const PASSED_SCREENING_STATUSES = new Set<DocumentScreeningStatusEnum>([
  DocumentScreeningStatusEnum.PASSED_AUTOMATED,
  DocumentScreeningStatusEnum.APPROVED_HUMAN,
]);

export type TutorOnboardingDocumentsEvaluation = {
  passed: boolean;
  reason?: string;
};

@Injectable()
export class TutorOnboardingDocumentEligibilityService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(DocumentScreeningEntity)
    private readonly screeningRepo: Repository<DocumentScreeningEntity>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
  ) {}

  async evaluateTutorOnboardingDocuments(
    tutorId: number,
  ): Promise<TutorOnboardingDocumentsEvaluation> {
    const pendingHuman = await findTutorIdsWithPendingDocumentReview(
      this.tutorRepo,
      [tutorId],
    );
    if (pendingHuman.has(tutorId)) {
      return {
        passed: false,
        reason: 'One or more documents are awaiting admin review.',
      };
    }

    const documents = await this.documentRepo.find({
      where: {
        tutorId,
        deleted: false,
      },
      order: { id: 'DESC' },
    });

    const onboardingDocs = documents.filter(
      (d) =>
        d.storageKey &&
        ONBOARDING_DOCUMENT_TYPES.includes(d.documentType),
    );

    const latestByType = new Map<DocumentTypeEnum, DocumentEntity>();
    for (const doc of onboardingDocs) {
      if (!latestByType.has(doc.documentType)) {
        latestByType.set(doc.documentType, doc);
      }
    }

    for (const requiredType of ONBOARDING_DOCUMENT_TYPES) {
      const doc = latestByType.get(requiredType);
      if (!doc) {
        return {
          passed: false,
          reason: 'All four onboarding documents must be uploaded.',
        };
      }

      const screening = await this.screeningRepo.findOne({
        where: { documentId: doc.id },
      });

      if (!screening) {
        return {
          passed: false,
          reason: 'Document verification is still in progress.',
        };
      }

      if (screening.status === DocumentScreeningStatusEnum.REJECTED_HUMAN) {
        return {
          passed: false,
          reason: 'One or more documents were not accepted.',
        };
      }

      if (!PASSED_SCREENING_STATUSES.has(screening.status)) {
        return {
          passed: false,
          reason: 'All documents must pass verification before continuing.',
        };
      }
    }

    return { passed: true };
  }

  async hasPassedAllOnboardingDocuments(tutorId: number): Promise<boolean> {
    const result = await this.evaluateTutorOnboardingDocuments(tutorId);
    return result.passed;
  }
}
