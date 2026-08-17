import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailPurpose } from './enums/email-purpose.enum';
import { EmailSendStatus } from './enums/email-send-status.enum';
import { UserRole } from '../../auth/enums/user-role.enum';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

function createRepos() {
  const emailSendRepository = {
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => row),
  };
  const userRepository = {
    findOne: jest.fn().mockResolvedValue(null),
  };
  return { emailSendRepository, userRepository };
}

function createService(
  env: Record<string, string | undefined>,
  repos = createRepos(),
) {
  const config = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
  const service = new EmailService(
    config,
    repos.emailSendRepository as never,
    repos.userRepository as never,
  );
  return { service, ...repos };
}

const baseInput = {
  to: 'user@example.com',
  subject: 'Test',
  text: 'Hello',
  html: '<p>Hello</p>',
  purpose: EmailPurpose.ADMIN_TEST,
};

describe('EmailService', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockSend.mockReset();
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('uses console when EMAIL_PROVIDER is console and records SENT', async () => {
    const { service, emailSendRepository } = createService({
      EMAIL_PROVIDER: 'console',
    });
    const result = await service.send({
      ...baseInput,
      to: 'dev@example.com',
      subject: 'Hello',
      text: 'Body',
      html: '<p>Body</p>',
    });
    expect(service.getProviderKind()).toBe('console');
    expect(result.messageId).toBeNull();
    expect(mockSend).not.toHaveBeenCalled();
    expect(emailSendRepository.save).toHaveBeenCalledTimes(1);
    expect(emailSendRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'dev@example.com',
        purpose: EmailPurpose.ADMIN_TEST,
        provider: 'console',
        status: EmailSendStatus.SENT,
        sesMessageId: null,
      }),
    );
  });

  it('uses ses when SES_FROM_EMAIL is set', () => {
    const { service } = createService({
      SES_FROM_EMAIL: 'info@tutorix.tech',
      SES_REGION: 'us-east-1',
    });
    expect(service.getStatus()).toEqual({
      provider: 'ses',
      fromEmail: 'info@tutorix.tech',
      fromName: 'Tutorix',
      region: 'us-east-1',
      configured: true,
    });
    expect(service.returnsOtpInApiResponse()).toBe(false);
  });

  it('sends through SES, returns MessageId, and records SENT with recipient snapshot', async () => {
    mockSend.mockResolvedValue({ MessageId: 'ses-123' });
    const repos = createRepos();
    repos.userRepository.findOne.mockResolvedValue({
      id: 9,
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: UserRole.STUDENT,
      email: 'user@example.com',
    });
    const { service, emailSendRepository } = createService(
      {
        EMAIL_PROVIDER: 'ses',
        SES_FROM_EMAIL: 'info@tutorix.tech',
        SES_FROM_NAME: 'Tutorix',
        SES_REGION: 'us-east-1',
      },
      repos,
    );
    const result = await service.send({
      ...baseInput,
      purpose: EmailPurpose.EMAIL_OTP,
      userId: 9,
      tags: { purpose: 'email-otp' },
    });
    expect(result).toEqual({ messageId: 'ses-123' });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(emailSendRepository.save).toHaveBeenCalledTimes(1);
    expect(emailSendRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        toEmail: 'user@example.com',
        recipientName: 'Ada Lovelace',
        recipientRole: UserRole.STUDENT,
        purpose: EmailPurpose.EMAIL_OTP,
        provider: 'ses',
        sesMessageId: 'ses-123',
        status: EmailSendStatus.SENT,
        errorMessage: null,
      }),
    );
  });

  it('rejects invalid recipient email without recording', async () => {
    const { service, emailSendRepository } = createService({
      EMAIL_PROVIDER: 'console',
    });
    await expect(
      service.send({ ...baseInput, to: 'not-an-email' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(emailSendRepository.save).not.toHaveBeenCalled();
  });

  it('rejects empty subject and body', async () => {
    const { service } = createService({ EMAIL_PROVIDER: 'console' });
    await expect(
      service.send({ ...baseInput, subject: '  ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.send({ ...baseInput, text: '  ', html: '  ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws in production when SES is not configured without recording', async () => {
    const { service, emailSendRepository } = createService({
      EMAIL_PROVIDER: 'console',
      NODE_ENV: 'production',
    });
    await expect(service.send(baseInput)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(emailSendRepository.save).not.toHaveBeenCalled();
  });

  it('records FAILED and surfaces SES errors', async () => {
    mockSend.mockRejectedValue(new Error('Email address is not verified.'));
    const { service, emailSendRepository } = createService({
      EMAIL_PROVIDER: 'ses',
      SES_FROM_EMAIL: 'info@tutorix.tech',
    });
    await expect(service.send(baseInput)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(emailSendRepository.save).toHaveBeenCalledTimes(1);
    expect(emailSendRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: EmailSendStatus.FAILED,
        sesMessageId: null,
        errorMessage: 'Email address is not verified.',
        purpose: EmailPurpose.ADMIN_TEST,
      }),
    );
  });

  it('does not fail the send if persist throws', async () => {
    mockSend.mockResolvedValue({ MessageId: 'ses-ok' });
    const repos = createRepos();
    repos.emailSendRepository.save.mockRejectedValue(new Error('db down'));
    const { service } = createService(
      {
        EMAIL_PROVIDER: 'ses',
        SES_FROM_EMAIL: 'info@tutorix.tech',
      },
      repos,
    );
    await expect(service.send(baseInput)).resolves.toEqual({
      messageId: 'ses-ok',
    });
  });
});
