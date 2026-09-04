import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

jest.mock('../../document/document-image-media', () => ({
  buildTutorDocumentImageMediaPatch: jest.fn(),
  profilePictureThumbnailKeys: jest.fn(() => []),
}));

import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { PasswordService } from './password.service';
import { JwtService } from './jwt.service';
import { UserRole } from '../enums/user-role.enum';
import { TutorService } from '../../tutor/services/tutor.service';
import { StudentService } from '../../student/services/student.service';
import { RegistrationSettingsService } from '../../registration-settings/services/registration-settings.service';
import { CommunicationService } from '../../communication/communication.service';
import { DeviceTokenService } from '../../communication/notification/device-token.service';
import { UserBankDetailsService } from '../../user-bank-details/services/user-bank-details.service';
import { EmailService } from '../../communication/email/email.service';
import { ProfilePictureService } from './profile-picture.service';

describe('AuthService.deleteMyAccount', () => {
  let service: AuthService;
  let userRepository: { findOne: jest.Mock; save: jest.Mock };
  let passwordResetTokenRepository: { update: jest.Mock };
  let passwordService: { hashPassword: jest.Mock };
  let jwtService: { revokeAllUserTokens: jest.Mock };
  let tutorService: { findByUserId: jest.Mock; remove: jest.Mock };
  let studentService: { removeByUserId: jest.Mock };
  let deviceTokenService: { unregisterAllForUser: jest.Mock };
  let userBankDetailsService: { anonymizeAndSoftDelete: jest.Mock };
  let profilePictureService: { clearStoredObjects: jest.Mock };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (row) => row),
    };
    passwordResetTokenRepository = {
      update: jest.fn().mockResolvedValue(undefined),
    };
    passwordService = {
      hashPassword: jest.fn().mockResolvedValue('hashed-random'),
    };
    jwtService = {
      revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
    };
    tutorService = {
      findByUserId: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockResolvedValue(true),
    };
    studentService = {
      removeByUserId: jest.fn().mockResolvedValue(undefined),
    };
    deviceTokenService = {
      unregisterAllForUser: jest.fn().mockResolvedValue(undefined),
    };
    userBankDetailsService = {
      anonymizeAndSoftDelete: jest.fn().mockResolvedValue(undefined),
    };
    profilePictureService = {
      clearStoredObjects: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: passwordResetTokenRepository,
        },
        { provide: PasswordService, useValue: passwordService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: {} },
        { provide: TutorService, useValue: tutorService },
        { provide: StudentService, useValue: studentService },
        { provide: RegistrationSettingsService, useValue: {} },
        { provide: CommunicationService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: DeviceTokenService, useValue: deviceTokenService },
        { provide: UserBankDetailsService, useValue: userBankDetailsService },
        { provide: ProfilePictureService, useValue: profilePictureService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('rejects admin self-delete', async () => {
    await expect(
      service.deleteMyAccount({ id: 1, role: UserRole.ADMIN } as User),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('anonymizes unique fields, revokes sessions, and soft-deletes', async () => {
    const stored = {
      id: 9,
      email: 'ada@example.com',
      mobile: '+919876543210',
      mobileNumber: '9876543210',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: UserRole.STUDENT,
      deleted: false,
      active: true,
    };
    userRepository.findOne.mockResolvedValue(stored);
    tutorService.findByUserId.mockResolvedValue({ id: 3 });

    await service.deleteMyAccount({ id: 9, role: UserRole.STUDENT } as User);

    expect(deviceTokenService.unregisterAllForUser).toHaveBeenCalledWith(9);
    expect(jwtService.revokeAllUserTokens).toHaveBeenCalledWith(9);
    expect(tutorService.remove).toHaveBeenCalledWith(3);
    expect(studentService.removeByUserId).toHaveBeenCalledWith(9);
    expect(userBankDetailsService.anonymizeAndSoftDelete).toHaveBeenCalledWith(9);
    expect(profilePictureService.clearStoredObjects).toHaveBeenCalled();
    expect(userRepository.save).toHaveBeenCalled();
    const saved = userRepository.save.mock.calls[0][0];
    expect(saved.deleted).toBe(true);
    expect(saved.active).toBe(false);
    expect(saved.email).toMatch(/^deleted\+9\.\d+@deleted\.tutorix\.invalid$/);
    expect(saved.mobile).toMatch(/^deleted:9:\d+$/);
    expect(saved.password).toBe('hashed-random');
  });
});
