import { BadRequestException } from '@nestjs/common';
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
import { TutorService } from '../../tutor/services/tutor.service';
import { StudentService } from '../../student/services/student.service';
import { RegistrationSettingsService } from '../../registration-settings/services/registration-settings.service';
import { CommunicationService } from '../../communication/communication.service';
import { DeviceTokenService } from '../../communication/notification/device-token.service';
import { UserBankDetailsService } from '../../user-bank-details/services/user-bank-details.service';
import { EmailService } from '../../communication/email/email.service';
import { ProfilePictureService } from './profile-picture.service';

describe('AuthService.changePassword', () => {
  let service: AuthService;
  let userRepository: { findOne: jest.Mock; save: jest.Mock };
  let passwordService: { hashPassword: jest.Mock; comparePassword: jest.Mock };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (row) => row),
    };
    passwordService = {
      hashPassword: jest.fn().mockResolvedValue('hashed-new'),
      comparePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: { update: jest.fn() },
        },
        { provide: PasswordService, useValue: passwordService },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: TutorService, useValue: {} },
        { provide: StudentService, useValue: {} },
        { provide: RegistrationSettingsService, useValue: {} },
        { provide: CommunicationService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: DeviceTokenService, useValue: {} },
        { provide: UserBankDetailsService, useValue: {} },
        { provide: ProfilePictureService, useValue: {} },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('rejects an incorrect current password', async () => {
    userRepository.findOne.mockResolvedValue({ id: 4, password: 'hashed-old' });
    passwordService.comparePassword.mockResolvedValue(false);

    await expect(
      service.changePassword(4, {
        currentPassword: 'wrong',
        newPassword: 'newpass',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('rejects when the new password matches the current password', async () => {
    userRepository.findOne.mockResolvedValue({ id: 4, password: 'hashed-old' });
    passwordService.comparePassword.mockResolvedValue(true);

    await expect(
      service.changePassword(4, {
        currentPassword: 'samepass',
        newPassword: 'samepass',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(passwordService.hashPassword).not.toHaveBeenCalled();
  });

  it('hashes and saves a new password', async () => {
    userRepository.findOne.mockResolvedValue({ id: 4, password: 'hashed-old' });
    passwordService.comparePassword.mockResolvedValue(true);

    await expect(
      service.changePassword(4, {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
      }),
    ).resolves.toBe(true);

    expect(passwordService.hashPassword).toHaveBeenCalledWith('newpass');
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 4, password: 'hashed-new' }),
    );
  });
});
