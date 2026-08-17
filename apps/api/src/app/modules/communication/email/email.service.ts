import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { EmailSendEntity } from './entities/email-send.entity';
import { EmailSendStatus } from './enums/email-send-status.enum';
import {
  EmailProviderKind,
  EmailStatus,
  SendEmailInput,
  SendEmailResult,
} from './email.types';
import { formatFromAddress, formatRecipientName } from './email.utils';
import { ConsoleEmailProvider } from './providers/console-email.provider';
import { SesEmailProvider } from './providers/ses-email.provider';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_LENGTH = 10_000;
const MAX_ERROR_LENGTH = 500;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESv2Client;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(EmailSendEntity)
    private readonly emailSendRepository: Repository<EmailSendEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.sesClient = new SESv2Client({ region: this.getRegion() });
  }

  getStatus(): EmailStatus {
    const fromEmail = this.getFromEmail();
    return {
      provider: this.getProviderKind(),
      fromEmail,
      fromName: this.getFromName(),
      region: this.getRegion(),
      configured: Boolean(fromEmail),
    };
  }

  getProviderKind(): EmailProviderKind {
    const explicit = this.configService
      .get<string>('EMAIL_PROVIDER')
      ?.trim()
      .toLowerCase();
    if (explicit === 'ses' || explicit === 'console') {
      return explicit;
    }
    return this.getFromEmail() ? 'ses' : 'console';
  }

  returnsOtpInApiResponse(): boolean {
    return this.getProviderKind() === 'console';
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const to = input.to.trim();
    if (!EMAIL_REGEX.test(to)) {
      throw new BadRequestException('Enter a valid recipient email');
    }
    if (!input.purpose) {
      throw new BadRequestException('Email purpose is required');
    }
    if (!input.subject.trim()) {
      throw new BadRequestException('Subject is required');
    }
    if (!input.text.trim() && !input.html.trim()) {
      throw new BadRequestException('Message body is required');
    }
    if (input.text.length > MAX_BODY_LENGTH) {
      throw new BadRequestException(
        `Message body must be at most ${MAX_BODY_LENGTH} characters`,
      );
    }

    const kind = this.getProviderKind();
    if (kind === 'ses') {
      this.assertSesReady();
    } else if (this.isProduction()) {
      throw new ServiceUnavailableException(
        'Email delivery is not configured (set EMAIL_PROVIDER=ses and SES_FROM_EMAIL)',
      );
    }

    try {
      let result: SendEmailResult;
      if (kind === 'ses') {
        const fromAddress = formatFromAddress(
          this.getFromEmail() as string,
          this.getFromName(),
        );
        const provider = new SesEmailProvider(this.sesClient, fromAddress);
        result = await provider.send({ ...input, to });
      } else {
        const provider = new ConsoleEmailProvider();
        result = await provider.send({ ...input, to });
      }

      await this.recordSend({
        input,
        to,
        provider: kind,
        status: EmailSendStatus.SENT,
        messageId: result.messageId,
        errorMessage: null,
      });
      return result;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Failed to send email';
      this.logger.error(`Failed to send email to ${to}: ${message}`);
      await this.recordSend({
        input,
        to,
        provider: kind,
        status: EmailSendStatus.FAILED,
        messageId: null,
        errorMessage: message,
      });
      throw new InternalServerErrorException(message);
    }
  }

  private async recordSend(args: {
    input: SendEmailInput;
    to: string;
    provider: EmailProviderKind;
    status: EmailSendStatus;
    messageId: string | null;
    errorMessage: string | null;
  }): Promise<void> {
    try {
      const recipient = await this.resolveRecipient(args.input, args.to);
      const now = new Date();
      const row = this.emailSendRepository.create({
        userId: recipient.userId,
        toEmail: args.to,
        recipientName: recipient.recipientName,
        recipientRole: recipient.recipientRole,
        purpose: args.input.purpose,
        subject: args.input.subject.trim().slice(0, 200),
        provider: args.provider,
        sesMessageId: args.messageId,
        status: args.status,
        errorMessage: args.errorMessage
          ? args.errorMessage.slice(0, MAX_ERROR_LENGTH)
          : null,
        sentAt: now,
        statusUpdatedAt: now,
      });
      await this.emailSendRepository.save(row);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to record email send';
      this.logger.error(`Failed to persist email_send for ${args.to}: ${message}`);
    }
  }

  private async resolveRecipient(
    input: SendEmailInput,
    to: string,
  ): Promise<{
    userId: number | null;
    recipientName: string | null;
    recipientRole: UserRole | null;
  }> {
    let user: User | null = null;
    if (input.userId) {
      user = await this.userRepository.findOne({
        where: { id: input.userId },
        select: ['id', 'firstName', 'lastName', 'role', 'email'],
      });
    }
    if (!user) {
      user = await this.userRepository.findOne({
        where: { email: to, deleted: false },
        select: ['id', 'firstName', 'lastName', 'role', 'email'],
      });
    }

    return {
      userId: user?.id ?? null,
      recipientName:
        input.recipientName?.trim() ||
        formatRecipientName(user?.firstName, user?.lastName),
      recipientRole: input.recipientRole ?? user?.role ?? null,
    };
  }

  private assertSesReady(): void {
    if (!this.getFromEmail()) {
      throw new ServiceUnavailableException(
        'Email delivery is not configured (SES_FROM_EMAIL is missing)',
      );
    }
  }

  private getFromEmail(): string | null {
    const value =
      this.configService.get<string>('SES_FROM_EMAIL')?.trim() ||
      process.env.SES_FROM_EMAIL?.trim();
    return value || null;
  }

  private getFromName(): string {
    return (
      this.configService.get<string>('SES_FROM_NAME')?.trim() ||
      process.env.SES_FROM_NAME?.trim() ||
      'Tutorix'
    );
  }

  private getRegion(): string {
    return (
      this.configService.get<string>('SES_REGION')?.trim() ||
      process.env.SES_REGION?.trim() ||
      this.configService.get<string>('AWS_REGION')?.trim() ||
      this.configService.get<string>('AWS_DEFAULT_REGION')?.trim() ||
      process.env.AWS_REGION?.trim() ||
      process.env.AWS_DEFAULT_REGION?.trim() ||
      'us-east-1'
    );
  }

  private isProduction(): boolean {
    return (
      (this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV) ===
      'production'
    );
  }
}
