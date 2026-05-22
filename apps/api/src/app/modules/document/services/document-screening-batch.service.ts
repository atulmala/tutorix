import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Repository } from 'typeorm';
import { BatchJobNameEnum } from '../../../batch-jobs/enums/batch-job-name.enum';
import { BatchJobTriggerEnum } from '../../../batch-jobs/enums/batch-job-trigger.enum';
import { BatchJobRunService } from '../../../batch-jobs/services/batch-job-run.service';
import { User } from '../../auth/entities/user.entity';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentScreeningEntity } from '../entities/document-screening.entity';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import { DocumentVerificationWorkflowStatusEnum } from '../enums/document-verification-workflow-status.enum';
import { DocumentScreeningStatusEnum } from '../enums/document-screening-status.enum';
import { DocumentScreeningAiService } from './document-screening-ai.service';

const ONBOARDING_DOCUMENT_TYPES = [
  DocumentTypeEnum.AADHAAR_CARD,
  DocumentTypeEnum.PAN_CARD,
  DocumentTypeEnum.CLASS_XII_MARKSHEET,
  DocumentTypeEnum.HIGHEST_DEGREE_CERTIFICATE,
];

export type DocumentProcessOutcome = 'processed' | 'skipped';

export function formatExpectedOwnerName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return [user.firstName, user.lastName]
    .filter((part) => part?.trim())
    .join(' ')
    .trim();
}

@Injectable()
export class DocumentScreeningBatchService {
  private readonly logger = new Logger(DocumentScreeningBatchService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiService: DocumentScreeningAiService,
    private readonly batchJobRunService: BatchJobRunService,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(DocumentScreeningEntity)
    private readonly screeningRepo: Repository<DocumentScreeningEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    const region =
      this.configService.get<string>('AWS_REGION') ||
      this.configService.get<string>('AWS_DEFAULT_REGION') ||
      'us-east-1';
    this.bucket =
      this.configService.get<string>('S3_DOCUMENTS_BUCKET') ||
      process.env.S3_DOCUMENTS_BUCKET ||
      '';
    this.s3 = new S3Client({ region });
  }

  getDefaultBatchLimit(): number {
    const raw =
      this.configService.get<string>('DOCUMENT_SCREENING_BATCH_LIMIT') ||
      process.env.DOCUMENT_SCREENING_BATCH_LIMIT ||
      '20';
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 20;
  }

  async findPendingDocuments(limit: number): Promise<DocumentEntity[]> {
    return this.documentRepo
      .createQueryBuilder('d')
      .leftJoin(
        DocumentScreeningEntity,
        's',
        's.document_id = d.id',
      )
      .where('d.verified = :verified', { verified: false })
      .andWhere('d.document_verification_workflow_status = :status', {
        status: DocumentVerificationWorkflowStatusEnum.PENDING,
      })
      .andWhere('d.document_type IN (:...types)', {
        types: ONBOARDING_DOCUMENT_TYPES,
      })
      .andWhere('d.storage_key IS NOT NULL')
      .andWhere('d.experience_id IS NULL')
      .andWhere('s.id IS NULL')
      .orderBy('d.id', 'ASC')
      .limit(limit)
      .getMany();
  }

  private async resolveOwnerName(document: DocumentEntity): Promise<string | null> {
    if (document.userId) {
      const user = await this.userRepo.findOne({
        where: { id: document.userId },
        select: ['id', 'firstName', 'lastName'],
      });
      if (user) {
        const name = formatExpectedOwnerName(user);
        if (name) return name;
      }
    }

    if (document.tutorId) {
      const user = await this.userRepo
        .createQueryBuilder('u')
        .innerJoin('tutor', 't', 't.user_id = u.id')
        .where('t.id = :tutorId', { tutorId: document.tutorId })
        .select(['u.id', 'u.firstName', 'u.lastName'])
        .getOne();
      if (user) {
        const name = formatExpectedOwnerName(user);
        if (name) return name;
      }
    }

    return null;
  }

  private async fetchDocumentBytes(storageKey: string): Promise<Buffer> {
    const get = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );
    if (!get.Body) {
      throw new Error('Empty S3 object body');
    }
    return Buffer.from(await get.Body.transformToByteArray());
  }

  private async persistScreening(
    document: DocumentEntity,
    batchJobRunId: number,
    status: DocumentScreeningStatusEnum,
    modelId: string | undefined,
    confidence: number,
    summaryNotes: string,
  ): Promise<void> {
    const screening = this.screeningRepo.create({
      documentId: document.id,
      batchJobRunId,
      status,
      automatedAt: new Date(),
      modelId,
      confidence,
      summaryNotes,
    });
    await this.screeningRepo.save(screening);

    document.verificationWorkflowStatus =
      DocumentVerificationWorkflowStatusEnum.COMPLETED;
    await this.documentRepo.save(document);
  }

  async processDocument(
    document: DocumentEntity,
    batchJobRunId: number,
  ): Promise<DocumentProcessOutcome> {
    if (!this.bucket) {
      throw new Error('S3_DOCUMENTS_BUCKET is not configured');
    }
    if (!document.storageKey) {
      throw new Error(`Document ${document.id} has no storage key`);
    }

    const ownerName = await this.resolveOwnerName(document);
    if (!ownerName) {
      await this.persistScreening(
        document,
        batchJobRunId,
        DocumentScreeningStatusEnum.PENDING_HUMAN,
        undefined,
        0,
        'Could not resolve tutor name for verification.',
      );
      this.logger.warn(
        `Document ${document.id}: rejected — tutor name not found`,
      );
      return 'processed';
    }

    let bytes: Buffer;
    try {
      bytes = await this.fetchDocumentBytes(document.storageKey);
    } catch (err) {
      await this.persistScreening(
        document,
        batchJobRunId,
        DocumentScreeningStatusEnum.PENDING_HUMAN,
        undefined,
        0,
        'Could not read uploaded file from storage.',
      );
      this.logger.warn(
        `Document ${document.id}: S3 read failed — ${err}`,
      );
      return 'processed';
    }

    const mimeType = document.mimeType?.split(';')[0]?.trim() || 'application/octet-stream';

    let aiResult;
    try {
      aiResult = await this.aiService.screenDocument(
        document.documentType,
        mimeType,
        bytes,
        ownerName,
      );
    } catch (err) {
      this.logger.error(
        `Document ${document.id}: AI screening failed — leaving PENDING for retry — ${err}`,
      );
      return 'skipped';
    }

    await this.persistScreening(
      document,
      batchJobRunId,
      aiResult.status,
      aiResult.modelId,
      aiResult.confidence,
      aiResult.summaryNotes,
    );

    this.logger.log(
      `Document ${document.id} tutor=${document.tutorId} type=${document.documentType} outcome=${aiResult.status} batch=${batchJobRunId}`,
    );
    return 'processed';
  }

  async runBatch(
    limit?: number,
    triggeredBy: BatchJobTriggerEnum = BatchJobTriggerEnum.CRON,
  ): Promise<{ processed: number; skipped: number; batchJobRunId?: number }> {
    const batchLimit = limit ?? this.getDefaultBatchLimit();
    const documents = await this.findPendingDocuments(batchLimit);

    if (documents.length === 0) {
      this.logger.debug('No pending documents to screen');
      return { processed: 0, skipped: 0 };
    }

    const run = await this.batchJobRunService.startRun(
      BatchJobNameEnum.DOCUMENT_ANALYSIS,
      {
        triggeredBy,
        itemsFound: documents.length,
        metadata: { batchLimit },
      },
    );

    this.logger.log(
      `Screening batch ${run.id} started — ${documents.length} document(s)`,
    );

    let processed = 0;
    let skipped = 0;

    try {
      for (const document of documents) {
        const outcome = await this.processDocument(document, run.id);
        if (outcome === 'skipped') {
          skipped += 1;
        } else {
          processed += 1;
        }
      }

      await this.batchJobRunService.finishRun(run.id, {
        itemsFound: documents.length,
        itemsProcessed: processed,
        itemsSkipped: skipped,
        itemsFailed: 0,
      });

      this.logger.log(
        `Screening batch ${run.id} finished — processed=${processed} skipped=${skipped}`,
      );
      return { processed, skipped, batchJobRunId: run.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.batchJobRunService.failRun(run.id, message, {
        itemsFound: documents.length,
        itemsProcessed: processed,
        itemsSkipped: skipped,
        itemsFailed: 0,
      });
      throw err;
    }
  }
}
