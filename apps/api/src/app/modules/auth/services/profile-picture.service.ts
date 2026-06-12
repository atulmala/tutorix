import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import {
  buildProfilePictureStorageKey,
  profilePictureThumbnailKeys,
  validateProfilePictureStorageKey,
} from '../profile-picture.helpers';
import { buildTutorDocumentImageMediaPatch } from '../../document/document-image-media';
import {
  ConfirmProfilePictureUploadInput,
  ProfilePictureUploadUrlResult,
} from '../dto/profile-picture-upload.dto';
import { RequestProfilePictureUploadUrlInput } from '../dto/request-profile-picture-upload-url.input';

const MAX_BYTES = 5 * 1024 * 1024;
const PRESIGN_EXPIRES_SEC = 900;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png']);

function mimeToExtension(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      throw new BadRequestException('Unsupported MIME type');
  }
}

@Injectable()
export class ProfilePictureService {
  private readonly logger = new Logger(ProfilePictureService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const region =
      this.configService.get<string>('AWS_REGION') ||
      this.configService.get<string>('AWS_DEFAULT_REGION') ||
      'us-east-1';
    this.bucket =
      this.configService.get<string>('S3_DOCUMENTS_BUCKET') ||
      process.env.S3_DOCUMENTS_BUCKET ||
      '';
    this.s3 = new S3Client({
      region,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  private ensureBucketConfigured(): void {
    if (!this.bucket) {
      throw new BadRequestException(
        'Profile picture storage is not configured (S3_DOCUMENTS_BUCKET)',
      );
    }
  }

  private getDocumentPublicBaseUrl(): string | undefined {
    const v =
      this.configService.get<string>('DOCUMENT_PUBLIC_BASE_URL')?.trim() ||
      process.env.DOCUMENT_PUBLIC_BASE_URL?.trim();
    return v || undefined;
  }

  /**
   * Returns an HTTPS URL suitable for <img src> — public CDN URL or presigned S3 GET.
   * Stored values may be bare S3 keys or s3:// URIs when DOCUMENT_PUBLIC_BASE_URL is unset.
   */
  async resolveDisplayUrl(ref: string | null | undefined): Promise<string | null> {
    const trimmed = ref?.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    this.ensureBucketConfigured();

    let key = trimmed;
    if (trimmed.startsWith('s3://')) {
      const withoutScheme = trimmed.slice('s3://'.length);
      const slash = withoutScheme.indexOf('/');
      if (slash === -1) return null;
      key = withoutScheme.slice(slash + 1);
    }

    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn: PRESIGN_EXPIRES_SEC },
    );
  }

  private assertAllowedMime(mime: string): void {
    if (!ALLOWED_MIME.has(mime)) {
      throw new BadRequestException('Only JPEG and PNG images are allowed');
    }
  }

  private assertByteSize(size: number): void {
    if (size <= 0 || size > MAX_BYTES) {
      throw new BadRequestException('Image must be between 1 byte and 5 MB');
    }
  }

  private async deleteExistingProfilePictureObjects(user: User): Promise<void> {
    const keys = new Set<string>();
    if (user.profilePictureStorageKey) {
      keys.add(user.profilePictureStorageKey);
      for (const thumb of profilePictureThumbnailKeys(user.profilePictureStorageKey)) {
        keys.add(thumb);
      }
    }
    for (const key of keys) {
      try {
        await this.s3.send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
      } catch (err) {
        this.logger.warn(`Failed to delete old profile picture object ${key}`, err);
      }
    }
  }

  async requestUploadUrl(
    user: User,
    input: RequestProfilePictureUploadUrlInput,
  ): Promise<ProfilePictureUploadUrlResult> {
    this.ensureBucketConfigured();
    this.assertAllowedMime(input.mimeType);
    this.assertByteSize(input.byteSize);

    const role = user.role;
    if (role !== UserRole.STUDENT && role !== UserRole.TUTOR) {
      throw new BadRequestException('Profile picture upload is not available for this role');
    }

    const ext = mimeToExtension(input.mimeType);
    const objectKey = buildProfilePictureStorageKey(role, user.id, ext);

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

  async confirmUpload(
    user: User,
    input: ConfirmProfilePictureUploadInput,
  ): Promise<User> {
    this.ensureBucketConfigured();
    this.assertAllowedMime(input.mimeType);
    this.assertByteSize(input.sizeBytes);

    try {
      validateProfilePictureStorageKey(user.role, user.id, input.storageKey);
    } catch {
      throw new BadRequestException('Invalid storage key for profile picture');
    }

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

    const fullUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!fullUser) {
      throw new BadRequestException('User not found');
    }

    await this.deleteExistingProfilePictureObjects(fullUser);

    const getRes = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: input.storageKey,
      }),
    );
    const bodyBytes = await getRes.Body?.transformToByteArray();
    if (!bodyBytes) {
      throw new BadRequestException('Could not read uploaded image');
    }

    const publicBaseUrl = this.getDocumentPublicBaseUrl();
    const mediaPatch = await buildTutorDocumentImageMediaPatch({
      s3: this.s3,
      bucket: this.bucket,
      storageKey: input.storageKey,
      mimeTypeHeader: input.mimeType,
      body: Buffer.from(bodyBytes),
      publicBaseUrl,
    });

    if (!mediaPatch) {
      throw new BadRequestException('Could not process profile picture');
    }

    fullUser.profilePictureStorageKey = input.storageKey;
    fullUser.profilePicture = mediaPatch.thumbnailSmall;
    fullUser.profilePictureThumbnailMedium = mediaPatch.thumbnailMedium;
    fullUser.profilePictureThumbnailLarge = mediaPatch.thumbnailLarge;
    fullUser.profilePictureOriginalUrl = mediaPatch.originalUrl;
    fullUser.profilePictureAverageColor = mediaPatch.averageColor;
    fullUser.profilePictureWidth = mediaPatch.width;
    fullUser.profilePictureHeight = mediaPatch.height;

    return this.userRepository.save(fullUser);
  }
}
