import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentScreeningEntity } from '../entities/document-screening.entity';
import { DocumentScreeningStatusEnum } from '../enums/document-screening-status.enum';
import { ONBOARDING_DOCUMENT_TYPES } from '../onboarding-document-types';
import { DocumentService } from './document.service';

@Injectable()
export class DocumentScreeningService {
  constructor(
    @InjectRepository(DocumentScreeningEntity)
    private readonly screeningRepo: Repository<DocumentScreeningEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    private readonly documentService: DocumentService,
  ) {}

  async findByDocumentId(documentId: number): Promise<DocumentScreeningEntity | null> {
    return this.screeningRepo.findOne({ where: { documentId } });
  }

  async findByDocumentIds(
    documentIds: number[],
  ): Promise<Map<number, DocumentScreeningEntity>> {
    if (documentIds.length === 0) {
      return new Map();
    }
    const rows = await this.screeningRepo
      .createQueryBuilder('s')
      .where('s.document_id IN (:...documentIds)', { documentIds })
      .getMany();
    return new Map(rows.map((row) => [row.documentId, row]));
  }

  async reviewByAdmin(
    documentId: number,
    approve: boolean,
    adminUserId: number,
    note?: string,
  ): Promise<{ document: DocumentEntity; screening: DocumentScreeningEntity }> {
    const document = await this.documentService.findDocumentById(documentId);

    if (
      document.documentType == null ||
      !ONBOARDING_DOCUMENT_TYPES.includes(document.documentType)
    ) {
      throw new BadRequestException('Document is not an onboarding document');
    }

    const screening = await this.findByDocumentId(documentId);
    if (!screening) {
      throw new NotFoundException('Document screening record not found');
    }
    if (screening.status !== DocumentScreeningStatusEnum.PENDING_HUMAN) {
      throw new BadRequestException(
        'Document is not pending admin review',
      );
    }

    screening.status = approve
      ? DocumentScreeningStatusEnum.APPROVED_HUMAN
      : DocumentScreeningStatusEnum.REJECTED_HUMAN;
    screening.reviewedByUserId = adminUserId;
    screening.reviewedAt = new Date();
    screening.reviewerNote = note?.trim() || undefined;

    await this.documentRepo.save({
      ...document,
      verified: approve,
      verifiedDate: approve ? new Date() : undefined,
      verifiedBy: approve ? ({ id: adminUserId } as User) : undefined,
    });

    const savedScreening = await this.screeningRepo.save(screening);
    const savedDocument = await this.documentService.findDocumentById(documentId);

    return { document: savedDocument, screening: savedScreening };
  }
}
