import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { TutorCertificationStageEnum } from '../../tutor/enums/tutor.enums';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentForTypeEnum } from '../enums/document-for-type.enum';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import { ConfirmTutorDocumentUploadInput } from '../dto/confirm-tutor-document-upload.input';
import { RequestTutorDocumentUploadUrlInput } from '../dto/request-tutor-document-upload-url.input';
import { TutorDocumentUploadUrlResult } from '../dto/tutor-document-upload-url.result';

const MAX_BYTES = 10 * 1024 * 1024;
const PRESIGN_EXPIRES_SEC = 900;

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);

const ONBOARDING_DOCUMENT_TYPES = new Set<DocumentTypeEnum>([
  DocumentTypeEnum.AADHAAR_CARD,
  DocumentTypeEnum.PAN_CARD,
  DocumentTypeEnum.CLASS_XII_MARKSHEET,
  DocumentTypeEnum.HIGHEST_DEGREE_CERTIFICATE,
]);

const DOCUMENT_DISPLAY_NAMES: Partial<Record<DocumentTypeEnum, string>> = {
  [DocumentTypeEnum.AADHAAR_CARD]: 'Aadhaar Card',
  [DocumentTypeEnum.PAN_CARD]: 'PAN Card',
  [DocumentTypeEnum.CLASS_XII_MARKSHEET]: 'Class XII Marksheet',
  [DocumentTypeEnum.HIGHEST_DEGREE_CERTIFICATE]: 'Highest Degree Certificate',
};

function documentTypeEnumKey(dt: DocumentTypeEnum): string {
  const key = DocumentTypeEnum[dt];
  if (typeof key !== 'string') {
    throw new BadRequestException('Invalid document type');
  }
  return key;
}

function mimeToExtension(mime: string): string {
  switch (mime) {
    case 'application/pdf':
      return 'pdf';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      throw new BadRequestException('Unsupported MIME type');
  }
}

@Injectable()
export class DocumentService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
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

  private ensureBucketConfigured(): void {
    if (!this.bucket) {
      throw new BadRequestException(
        'Document storage is not configured (S3_DOCUMENTS_BUCKET)',
      );
    }
  }

  assertOnboardingDocumentType(documentType: DocumentTypeEnum): void {
    if (!ONBOARDING_DOCUMENT_TYPES.has(documentType)) {
      throw new BadRequestException(
        'Document type is not allowed for tutor onboarding upload',
      );
    }
  }

  assertAllowedMime(mimeType: string): void {
    if (!ALLOWED_MIME.has(mimeType)) {
      throw new BadRequestException(
        'Only PDF, JPEG, or PNG files are allowed for this upload',
      );
    }
  }

  assertByteSize(byteSize: number): void {
    if (byteSize < 1 || byteSize > MAX_BYTES) {
      throw new BadRequestException(
        `File size must be between 1 and ${MAX_BYTES} bytes`,
      );
    }
  }

  async getTutorForDocumentUpload(user: User): Promise<Tutor> {
    if (user.role !== UserRole.TUTOR) {
      throw new ForbiddenException('Only tutors can upload onboarding documents');
    }
    const tutor = await this.tutorRepo.findOne({
      where: { userId: user.id },
    });
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }
    if (tutor.certificationStage !== TutorCertificationStageEnum.docs) {
      throw new BadRequestException(
        'Document upload is only available during the documents onboarding step',
      );
    }
    return tutor;
  }

  buildExpectedKeyPrefix(tutorId: number, documentType: DocumentTypeEnum): string {
    const typeKey = documentTypeEnumKey(documentType);
    return `tutors/${tutorId}/onboarding/${typeKey}/`;
  }

  validateStorageKeyForTutor(
    tutorId: number,
    documentType: DocumentTypeEnum,
    storageKey: string,
  ): void {
    const prefix = this.buildExpectedKeyPrefix(tutorId, documentType);
    if (!storageKey.startsWith(prefix) || storageKey.length <= prefix.length) {
      throw new BadRequestException('Invalid storage key for this document');
    }
    const filename = storageKey.slice(prefix.length);
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      throw new BadRequestException('Invalid storage key format');
    }
  }

  async requestTutorDocumentUploadUrl(
    user: User,
    input: RequestTutorDocumentUploadUrlInput,
  ): Promise<TutorDocumentUploadUrlResult> {
    this.ensureBucketConfigured();
    this.assertOnboardingDocumentType(input.documentType);
    this.assertAllowedMime(input.mimeType);
    this.assertByteSize(input.byteSize);

    const tutor = await this.getTutorForDocumentUpload(user);
    const ext = mimeToExtension(input.mimeType);
    const typeKey = documentTypeEnumKey(input.documentType);
    const objectKey = `tutors/${tutor.id}/onboarding/${typeKey}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: input.mimeType,
      ContentLength: input.byteSize,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: PRESIGN_EXPIRES_SEC,
    });

    return {
      uploadUrl,
      storageKey: objectKey,
      expiresInSeconds: PRESIGN_EXPIRES_SEC,
      contentType: input.mimeType,
    };
  }

  async confirmTutorDocumentUpload(
    user: User,
    input: ConfirmTutorDocumentUploadInput,
  ): Promise<DocumentEntity> {
    this.ensureBucketConfigured();
    this.assertOnboardingDocumentType(input.documentType);
    this.assertAllowedMime(input.mimeType);
    this.assertByteSize(input.sizeBytes);

    const tutor = await this.getTutorForDocumentUpload(user);
    this.validateStorageKeyForTutor(tutor.id, input.documentType, input.storageKey);

    let head;
    try {
      head = await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: input.storageKey,
        }),
      );
    } catch {
      throw new BadRequestException(
        'Uploaded file was not found in storage. Complete the PUT upload first.',
      );
    }

    const contentLength = head.ContentLength ?? 0;
    if (contentLength !== input.sizeBytes) {
      throw new BadRequestException('Uploaded file size does not match');
    }

    const headMime = head.ContentType?.split(';')[0]?.trim();
    if (headMime && headMime !== input.mimeType) {
      throw new BadRequestException('Uploaded file content type does not match');
    }

    const displayName =
      DOCUMENT_DISPLAY_NAMES[input.documentType] ??
      documentTypeEnumKey(input.documentType);

    const existing = await this.documentRepo.findOne({
      where: {
        tutorId: tutor.id,
        documentType: input.documentType,
        experience: IsNull(),
      },
    });

    if (existing?.storageKey && existing.storageKey !== input.storageKey) {
      try {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: existing.storageKey,
          }),
        );
      } catch {
        // Best-effort cleanup; new object is already stored
      }
    }

    const filename =
      input.originalFilename?.trim() ||
      input.storageKey.split('/').pop() ||
      'document';

    const entity =
      existing ??
      this.documentRepo.create({
        tutorId: tutor.id,
        userId: user.id,
        documentForType: DocumentForTypeEnum.TUTOR,
        documentType: input.documentType,
        name: displayName,
        verified: false,
      });

    entity.name = displayName;
    entity.filename = filename;
    entity.mimeType = input.mimeType;
    entity.size = input.sizeBytes;
    entity.storageKey = input.storageKey;
    entity.documentType = input.documentType;
    entity.tutorId = tutor.id;
    entity.userId = user.id;
    entity.documentForType = DocumentForTypeEnum.TUTOR;

    return this.documentRepo.save(entity);
  }

  async findDocumentsByTutorId(tutorId: number): Promise<DocumentEntity[]> {
    return this.documentRepo.find({
      where: { tutorId },
      order: { id: 'ASC' },
    });
  }
}
