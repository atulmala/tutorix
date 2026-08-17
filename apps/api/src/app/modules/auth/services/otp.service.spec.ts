import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OtpService } from './otp.service';
import { Otp } from '../entities/otp.entity';
import { User } from '../entities/user.entity';
import { OtpPurpose } from '../enums/otp-purpose.enum';
import { EmailService } from '../../communication/email/email.service';

describe('OtpService', () => {
  let service: OtpService;
  let otpRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };
  let emailService: {
    send: jest.Mock;
    returnsOtpInApiResponse: jest.Mock;
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
      }),
    };
    emailService = {
      send: jest.fn().mockResolvedValue({ messageId: 'ses-1' }),
      returnsOtpInApiResponse: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: getRepositoryToken(Otp), useValue: otpRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(OtpService);
  });

  it('sends email OTP and omits the code when SES is the provider', async () => {
    const result = await service.generateOtp({
      userId: 9,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
    });
    expect(emailService.send).toHaveBeenCalledTimes(1);
    expect(emailService.send.mock.calls[0][0].to).toBe('user@example.com');
    expect(emailService.send.mock.calls[0][0].purpose).toBe('EMAIL_OTP');
    expect(emailService.send.mock.calls[0][0].userId).toBe(9);
    expect(emailService.send.mock.calls[0][0].recipientRole).toBe('STUDENT');
    expect(emailService.send.mock.calls[0][0].text).toMatch(/\d{6}/);
    expect(result.otp).toBeNull();
  });

  it('returns the email OTP when the console provider is active', async () => {
    emailService.returnsOtpInApiResponse.mockReturnValue(true);
    const result = await service.generateOtp({
      userId: 9,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
    });
    expect(emailService.send).toHaveBeenCalled();
    expect(result.otp).toMatch(/^\d{6}$/);
  });

  it('does not send email for mobile OTP and still returns the code', async () => {
    const result = await service.generateOtp({
      userId: 9,
      purpose: OtpPurpose.MOBILE_VERIFICATION,
    });
    expect(emailService.send).not.toHaveBeenCalled();
    expect(result.otp).toMatch(/^\d{6}$/);
  });
});
