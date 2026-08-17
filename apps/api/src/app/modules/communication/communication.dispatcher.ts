import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { EmailPurpose } from './email/enums/email-purpose.enum';
import { EmailService } from './email/email.service';
import { formatRecipientName } from './email/email.utils';
import { NotificationService } from './notification/notification.service';
import { SmsService } from './sms/sms.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { CommunicationSendEntity } from './entities/communication-send.entity';
import { CommunicationRuleEntity } from './entities/communication-rule.entity';
import { CommunicationTemplateEntity } from './entities/communication-template.entity';
import { CommunicationAudience } from './enums/communication-audience.enum';
import { CommunicationChannel } from './enums/communication-channel.enum';
import { CommunicationEvent } from './enums/communication-event.enum';
import { CommunicationSendStatus } from './enums/communication-send-status.enum';
import {
  defaultTemplatePath,
  enabledChannelsFromRule,
  findCatalogEntry,
} from './event-catalog';
import { renderTemplate } from './template.renderer';
import { TemplateStore } from './template.store';

export type CommunicationEmitInput = {
  event: CommunicationEvent;
  userId: number;
  audience?: CommunicationAudience;
  entityType?: string;
  entityId?: string | number;
  payload: Record<string, unknown>;
};

@Injectable()
export class CommunicationDispatcher {
  private readonly logger = new Logger(CommunicationDispatcher.name);

  constructor(
    @InjectRepository(CommunicationRuleEntity)
    private readonly ruleRepository: Repository<CommunicationRuleEntity>,
    @InjectRepository(CommunicationTemplateEntity)
    private readonly templateRepository: Repository<CommunicationTemplateEntity>,
    @InjectRepository(CommunicationSendEntity)
    private readonly sendRepository: Repository<CommunicationSendEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly templateStore: TemplateStore,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly smsService: SmsService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async dispatch(input: CommunicationEmitInput): Promise<void> {
    const audience = input.audience ?? CommunicationAudience.ACTOR;
    const catalog = findCatalogEntry(input.event, audience);
    const rule = await this.ruleRepository.findOne({
      where: { event: input.event, audience, deleted: false },
    });

    if (!rule || !rule.enabled) {
      this.logger.debug(
        `Skip ${input.event}/${audience}: rule missing or disabled`,
      );
      return;
    }

    const channels = enabledChannelsFromRule(rule);
    if (channels.length === 0) {
      if (rule.mandatory || catalog?.mandatory) {
        throw new BadRequestException(
          `Mandatory communication event ${input.event} has no channels enabled`,
        );
      }
      return;
    }

    const user = await this.userRepository.findOne({
      where: { id: input.userId, deleted: false },
      select: [
        'id',
        'email',
        'mobileCountryCode',
        'mobileNumber',
        'firstName',
        'lastName',
        'role',
      ],
    });
    if (!user) {
      throw new BadRequestException('User not found for communication emit');
    }

    const errors: Error[] = [];
    for (const channel of channels) {
      try {
        await this.dispatchChannel(input, audience, channel, user);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);
        this.logger.error(
          `Failed ${input.event}/${audience}/${channel}: ${err.message}`,
        );
      }
    }

    if (errors.length > 0) {
      throw errors[0];
    }
  }

  private async dispatchChannel(
    input: CommunicationEmitInput,
    audience: CommunicationAudience,
    channel: CommunicationChannel,
    user: User,
  ): Promise<void> {
    const idempotencyKey = this.idempotencyKey(
      input,
      audience,
      channel,
    );
    if (idempotencyKey) {
      const existing = await this.sendRepository.findOne({
        where: { idempotencyKey },
      });
      if (existing?.status === CommunicationSendStatus.SENT) {
        return;
      }
    }

    const templateRow = await this.templateRepository.findOne({
      where: {
        event: input.event,
        audience,
        channel,
        deleted: false,
      },
    });
    const templatePath =
      templateRow?.templatePath ??
      defaultTemplatePath(input.event, audience, channel);
    const file = this.templateStore.read(templatePath);
    const htmlEscape = channel === CommunicationChannel.EMAIL;
    const renderedBody = renderTemplate(file.body, input.payload, {
      htmlEscape,
    });
    const renderedAttrs = Object.fromEntries(
      Object.entries(file.attributes).map(([key, value]) => [
        key,
        renderTemplate(value, input.payload, {
          htmlEscape: htmlEscape && key !== 'subject' && key !== 'text',
        }),
      ]),
    );

    let to: string | null = null;
    let provider = 'console';
    let messageId: string | null = null;

    try {
      if (channel === CommunicationChannel.EMAIL) {
        if (!user.email) {
          throw new BadRequestException('User email is required');
        }
        to = user.email;
        const subject = renderedAttrs.subject?.trim() || 'Tutorix';
        const text =
          renderedAttrs.text?.trim() || htmlToPlainText(renderedBody);
        const result = await this.emailService.send({
          to: user.email,
          subject,
          html: renderedBody,
          text,
          purpose: emailPurposeForEvent(input.event),
          userId: user.id,
          recipientName: formatRecipientName(user.firstName, user.lastName),
          recipientRole: user.role,
          tags: { event: input.event, audience },
        });
        provider = this.emailService.getProviderKind();
        messageId = result.messageId;
      } else if (channel === CommunicationChannel.PUSH) {
        to = `user:${user.id}`;
        const title = renderedAttrs.title?.trim() || 'Tutorix';
        const result = await this.notificationService.send({
          userId: user.id,
          title,
          body: renderedBody.trim(),
          data: {
            event: input.event,
            entityType: input.entityType ?? '',
            entityId: input.entityId != null ? String(input.entityId) : '',
          },
        });
        provider = this.notificationService.getProviderKind();
        messageId = result.messageId;
        if (!result.success && provider === 'fcm') {
          throw new Error('Push notification failed');
        }
      } else if (channel === CommunicationChannel.SMS) {
        to = formatPhone(user.mobileCountryCode, user.mobileNumber);
        if (!to) {
          throw new BadRequestException('User mobile number is required');
        }
        await this.smsService.send({
          to,
          body: renderedBody.trim(),
          userId: user.id,
        });
        provider = 'console';
      } else {
        to = formatPhone(user.mobileCountryCode, user.mobileNumber);
        if (!to) {
          throw new BadRequestException('User mobile number is required');
        }
        await this.whatsAppService.send({
          to,
          body: renderedBody.trim(),
          userId: user.id,
        });
        provider = 'console';
      }

      await this.recordSend({
        input,
        audience,
        channel,
        userId: user.id,
        to,
        provider,
        status: CommunicationSendStatus.SENT,
        messageId,
        errorMessage: null,
        idempotencyKey,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.recordSend({
        input,
        audience,
        channel,
        userId: user.id,
        to,
        provider,
        status: CommunicationSendStatus.FAILED,
        messageId: null,
        errorMessage: message,
        idempotencyKey,
      });
      throw error;
    }
  }

  private idempotencyKey(
    input: CommunicationEmitInput,
    audience: CommunicationAudience,
    channel: CommunicationChannel,
  ): string | null {
    if (!input.entityType || input.entityId == null) {
      return null;
    }
    return `${input.event}:${audience}:${channel}:${input.userId}:${input.entityType}:${input.entityId}`;
  }

  private async recordSend(args: {
    input: CommunicationEmitInput;
    audience: CommunicationAudience;
    channel: CommunicationChannel;
    userId: number;
    to: string | null;
    provider: string;
    status: CommunicationSendStatus;
    messageId: string | null;
    errorMessage: string | null;
    idempotencyKey: string | null;
  }): Promise<void> {
    try {
      const row = this.sendRepository.create({
        event: args.input.event,
        audience: args.audience,
        channel: args.channel,
        userId: args.userId,
        to: args.to,
        provider: args.provider,
        providerMessageId: args.messageId,
        status: args.status,
        errorMessage: args.errorMessage
          ? args.errorMessage.slice(0, 500)
          : null,
        idempotencyKey: args.idempotencyKey,
      });
      await this.sendRepository.save(row);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to record send';
      this.logger.error(`Failed to persist communication_send: ${message}`);
    }
  }
}

export function emailPurposeForEvent(event: CommunicationEvent): EmailPurpose {
  switch (event) {
    case CommunicationEvent.EMAIL_VERIFICATION:
      return EmailPurpose.EMAIL_OTP;
    case CommunicationEvent.WALLET_TOP_UP:
      return EmailPurpose.WALLET_TOP_UP;
    case CommunicationEvent.CLASS_BOOKED:
      return EmailPurpose.CLASS_BOOKING;
    case CommunicationEvent.CLASS_STARTING_SOON:
      return EmailPurpose.CLASS_REMINDER;
    default:
      return EmailPurpose.OTHER;
  }
}

function formatPhone(
  countryCode?: string | null,
  number?: string | null,
): string | null {
  if (!number) {
    return null;
  }
  return `${countryCode || '+91'} ${number}`.trim();
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
