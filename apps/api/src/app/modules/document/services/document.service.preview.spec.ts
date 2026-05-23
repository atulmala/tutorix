import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DocumentService } from './document.service';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentScreeningEntity } from '../entities/document-screening.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { UserRole } from '../../auth/enums/user-role.enum';

jest.mock('../document-image-media', () => ({
  buildTutorDocumentImageMediaPatch: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('DocumentService.resolvePreviewUrl', () => {
  let service: DocumentService;
  let tutorFindOne: jest.Mock;

  const tutorUser = {
    id: 10,
    role: UserRole.TUTOR,
  };

  const doc = {
    id: 1,
    tutorId: 5,
    storageKey: 'tutors/5/onboarding/PAN_CARD/file.pdf',
    thumbnailSmall: 'tutors/5/onboarding/PAN_CARD/file_thumb_sm.webp',
    mimeType: 'application/pdf',
  } as DocumentEntity;

  beforeEach(async () => {
    tutorFindOne = jest.fn().mockResolvedValue({ id: 5, userId: 10 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
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
          provide: getRepositoryToken(DocumentEntity),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(DocumentScreeningEntity),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Tutor),
          useValue: { findOne: tutorFindOne },
        },
      ],
    }).compile();

    service = module.get(DocumentService);
    (getSignedUrl as jest.Mock).mockReset();
  });

  it('returns public CDN thumbnail without presigning', async () => {
    const cdnDoc = {
      ...doc,
      thumbnailSmall: 'https://cdn.example.com/thumb.webp',
    } as DocumentEntity;

    const url = await service.resolvePreviewUrl(cdnDoc, tutorUser as never);
    expect(url).toBe('https://cdn.example.com/thumb.webp');
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it('presigns S3 key when thumbnail is stored as key', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue(
      'https://s3.example.com/presigned',
    );

    const url = await service.resolvePreviewUrl(doc, tutorUser as never);
    expect(url).toBe('https://s3.example.com/presigned');
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'tutors/5/onboarding/PAN_CARD/file_thumb_sm.webp',
        }),
      }),
      expect.objectContaining({ expiresIn: 900 }),
    );
  });

  it('rejects unauthenticated callers', async () => {
    await expect(service.resolvePreviewUrl(doc, null)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects tutors who do not own the document', async () => {
    tutorFindOne.mockResolvedValue({ id: 99, userId: 10 });

    await expect(
      service.resolvePreviewUrl(doc, tutorUser as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('DocumentService admin preview URLs', () => {
  let service: DocumentService;

  const doc = {
    id: 1,
    tutorId: 5,
    storageKey: 'tutors/5/onboarding/PAN_CARD/file.pdf',
    thumbnailSmall: 'https://cdn.example.com/thumb.webp',
    mimeType: 'application/pdf',
  } as DocumentEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
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
          provide: getRepositoryToken(DocumentEntity),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(DocumentScreeningEntity),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Tutor),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(DocumentService);
    (getSignedUrl as jest.Mock).mockReset();
  });

  it('resolvePreviewUrlForAdmin returns CDN thumbnail without tutor auth', async () => {
    const url = await service.resolvePreviewUrlForAdmin(doc);
    expect(url).toBe('https://cdn.example.com/thumb.webp');
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it('resolveViewUrlForAdmin presigns the full storage key', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue('https://s3.example.com/full');

    const url = await service.resolveViewUrlForAdmin(doc);
    expect(url).toBe('https://s3.example.com/full');
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'test-bucket',
          Key: doc.storageKey,
        }),
      }),
      expect.objectContaining({ expiresIn: 900 }),
    );
  });
});
