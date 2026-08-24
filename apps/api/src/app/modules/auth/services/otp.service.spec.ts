import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { OtpService } from './otp.service';
import { Otp } from '../entities/otp.entity';
import { User } from '../entities/user.entity';
import { OtpPurpose } from '../enums/otp-purpose.enum';
import { CommunicationService } from '../../communication/communication.service';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

describe('OtpService', () => {
  let service: OtpService;
  let otpRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock; save: jest.Mock };
  let communicationService: {
    emit: jest.Mock;
    returnsOtpInApiResponse: jest.Mock;
    isMobileVerificationRequired: jest.Mock;
  };

  beforeEach(async () => {
    otpRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (row) => row),
      create: jest.fn().mockImplementation((row) => row),
    };
    userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 9,
        email: 'user@example.com',
        mobileCountryCode: '+91',
        mobileNumber: '9876543210',
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: 'STUDENT',
        isMobileVerified: false,
        isEmailVerified: false,
        isSignupComplete: false,
      }),
      save: jest.fn().mockImplementation(async (row) => row),
    };
    communicationService = {
      emit: jest.fn().mockResolvedValue(undefined),
      returnsOtpInApiResponse: jest.fn().mockReturnValue(false),
      isMobileVerificationRequired: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: getRepositoryToken(Otp), useValue: otpRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: CommunicationService, useValue: communicationService },
      ],
    }).compile();

    service = module.get(OtpService);
  });

  it('emits EMAIL_VERIFICATION and omits the code when SES is the provider', async () => {
    const result = await service.generateOtp({
      userId: 9,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
    });
    expect(communicationService.emit).toHaveBeenCalledTimes(1);
    expect(communicationService.emit.mock.calls[0][0].event).toBe(
      CommunicationEvent.EMAIL_VERIFICATION,
    );
    expect(communicationService.emit.mock.calls[0][0].userId).toBe(9);
    expect(communicationService.emit.mock.calls[0][0].payload.otp).toMatch(
      /^\d{6}$/,
    );
    expect(result.otp).toBeNull();
  });

  it('returns the email OTP when the console provider is active', async () => {
    communicationService.returnsOtpInApiResponse.mockReturnValue(true);
    const result = await service.generateOtp({
      userId: 9,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
    });
    expect(communicationService.emit).toHaveBeenCalled();
    expect(result.otp).toMatch(/^\d{6}$/);
  });

  it('emits MOBILE_VERIFICATION and still returns the code', async () => {
    communicationService.isMobileVerificationRequired.mockResolvedValue(true);
    const result = await service.generateOtp({
      userId: 9,
      purpose: OtpPurpose.MOBILE_VERIFICATION,
    });
    expect(communicationService.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        event: CommunicationEvent.MOBILE_VERIFICATION,
        userId: 9,
      }),
    );
    expect(result.otp).toMatch(/^\d{6}$/);
  });

  it('rejects mobile OTP generate when mobile verification is off', async () => {
    communicationService.isMobileVerificationRequired.mockResolvedValue(false);
    await expect(
      service.generateOtp({
        userId: 9,
        purpose: OtpPurpose.MOBILE_VERIFICATION,
      }),
    ).rejects.toThrow('Mobile verification is turned off');
    expect(communicationService.emit).not.toHaveBeenCalled();
  });

  describe('verifyOtp', () => {
    const otp = '123456';
    const future = new Date(Date.now() + 10 * 60 * 1000);

    beforeEach(() => {
      otpRepository.findOne.mockResolvedValue({
        userId: 9,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        otpHash: hashOtp(otp),
        expiresAt: future,
      });
    });

    it('deems mobile verified when email OTP succeeds and mobile verification is off', async () => {
      communicationService.isMobileVerificationRequired.mockResolvedValue(false);

      const result = await service.verifyOtp({
        userId: 9,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        timestamp: new Date(),
        otp,
      });

      expect(result.success).toBe(true);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isEmailVerified: true,
          isMobileVerified: true,
          isSignupComplete: true,
        }),
      );
    });

    it('does not deem mobile verified when email OTP succeeds and mobile verification is required', async () => {
      communicationService.isMobileVerificationRequired.mockResolvedValue(true);

      await service.verifyOtp({
        userId: 9,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        timestamp: new Date(),
        otp,
      });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isEmailVerified: true,
          isMobileVerified: false,
          isSignupComplete: false,
        }),
      );
    });

    it('still marks mobile verified on MOBILE_VERIFICATION OTP', async () => {
      otpRepository.findOne.mockResolvedValue({
        userId: 9,
        purpose: OtpPurpose.MOBILE_VERIFICATION,
        otpHash: hashOtp(otp),
        expiresAt: future,
      });

      await service.verifyOtp({
        userId: 9,
        purpose: OtpPurpose.MOBILE_VERIFICATION,
        timestamp: new Date(),
        otp,
      });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isMobileVerified: true,
          isEmailVerified: false,
          isSignupComplete: false,
        }),
      );
    });
  });
});
