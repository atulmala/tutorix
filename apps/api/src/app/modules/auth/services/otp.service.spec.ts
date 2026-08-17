import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OtpService } from './otp.service';
import { Otp } from '../entities/otp.entity';
import { User } from '../entities/user.entity';
import { OtpPurpose } from '../enums/otp-purpose.enum';
import { CommunicationService } from '../../communication/communication.service';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';

describe('OtpService', () => {
  let service: OtpService;
  let otpRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };
  let communicationService: {
    emit: jest.Mock;
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
    communicationService = {
      emit: jest.fn().mockResolvedValue(undefined),
      returnsOtpInApiResponse: jest.fn().mockReturnValue(false),
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
});
