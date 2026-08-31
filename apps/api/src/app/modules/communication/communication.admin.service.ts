import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from './email/email.service';
import { NotificationService } from './notification/notification.service';
import { CommunicationRuleEntity } from './entities/communication-rule.entity';
import { CommunicationTemplateEntity } from './entities/communication-template.entity';
import { CommunicationAudience } from './enums/communication-audience.enum';
import { CommunicationChannel } from './enums/communication-channel.enum';
import { CommunicationEvent } from './enums/communication-event.enum';
import {
  ALL_CHANNELS,
  COMMUNICATION_CATALOG,
  defaultTemplatePath,
  findCatalogEntry,
  samplePayload,
} from './event-catalog';
import { assertKnownPlaceholders, renderTemplate } from './template.renderer';
import {
  serializeTemplateFile,
  TemplateStore,
} from './template.store';
import { AdminCommunicationCatalog } from './dto/admin-communication-catalog.dto';
import { AdminUpdateCommunicationRuleInput } from './dto/admin-update-communication-rule.input';
import { AdminUpdateCommunicationTemplateInput } from './dto/admin-update-communication-template.input';
import { AdminCommunicationRuleView } from './dto/admin-communication-rule-view.dto';
import { AdminCommunicationChannelTemplate } from './dto/admin-communication-channel-template.dto';

@Injectable()
export class CommunicationAdminService {
  constructor(
    @InjectRepository(CommunicationRuleEntity)
    private readonly ruleRepository: Repository<CommunicationRuleEntity>,
    @InjectRepository(CommunicationTemplateEntity)
    private readonly templateRepository: Repository<CommunicationTemplateEntity>,
    private readonly templateStore: TemplateStore,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async getCatalog(): Promise<AdminCommunicationCatalog> {
    const rules = await this.ruleRepository.find({
      where: { deleted: false },
    });
    const templates = await this.templateRepository.find({
      where: { deleted: false },
    });
    const ruleByKey = new Map(
      rules.map((rule) => [`${rule.event}:${rule.audience}`, rule]),
    );
    const templateByKey = new Map(
      templates.map((row) => [
        `${row.event}:${row.audience}:${row.channel}`,
        row,
      ]),
    );

    const events: AdminCommunicationRuleView[] = COMMUNICATION_CATALOG.map(
      (entry) => {
        const rule = ruleByKey.get(`${entry.event}:${entry.audience}`);
        const channelTemplates: AdminCommunicationChannelTemplate[] =
          ALL_CHANNELS.map((channel) => {
            const row = templateByKey.get(
              `${entry.event}:${entry.audience}:${channel}`,
            );
            const templatePath =
              row?.templatePath ??
              defaultTemplatePath(entry.event, entry.audience, channel);
            return this.loadChannelTemplate(
              entry.event,
              entry.audience,
              channel,
              templatePath,
            );
          });

        return {
          event: entry.event,
          audience: entry.audience,
          label: entry.label,
          enabled: rule?.enabled ?? true,
          mandatory: rule?.mandatory ?? entry.mandatory,
          emailEnabled: rule?.emailEnabled ?? entry.defaultChannels.email,
          smsEnabled: rule?.smsEnabled ?? entry.defaultChannels.sms,
          pushEnabled: rule?.pushEnabled ?? entry.defaultChannels.push,
          whatsappEnabled:
            rule?.whatsappEnabled ?? entry.defaultChannels.whatsapp,
          onScreenEnabled:
            rule?.onScreenEnabled ?? entry.defaultChannels.onScreen,
          offsetMinutes: rule?.offsetMinutes ?? entry.offsetMinutes ?? null,
          allowedVariables: entry.allowedVariables,
          samplePayloadJson: JSON.stringify(samplePayload(entry.event)),
          templates: channelTemplates,
        };
      },
    );

    return {
      events,
      emailConfigured:
        this.emailService.getProviderKind() === 'console' ||
        this.emailService.getStatus().configured,
      pushConfigured: this.notificationService.isConfigured(),
      smsConfigured: true,
      whatsappConfigured: true,
    };
  }

  async updateRule(
    input: AdminUpdateCommunicationRuleInput,
  ): Promise<AdminCommunicationCatalog> {
    const catalog = findCatalogEntry(input.event, input.audience);
    if (!catalog) {
      throw new BadRequestException('Unknown communication event/audience');
    }

    const enabledCount = [
      input.emailEnabled,
      input.smsEnabled,
      input.pushEnabled,
      input.whatsappEnabled,
      input.onScreenEnabled,
    ].filter(Boolean).length;
    const mandatory = catalog.mandatory;
    if (mandatory && enabledCount === 0) {
      throw new BadRequestException(
        'Mandatory events must keep at least one channel enabled',
      );
    }

    let rule = await this.ruleRepository.findOne({
      where: { event: input.event, audience: input.audience },
    });
    if (!rule) {
      rule = this.ruleRepository.create({
        event: input.event,
        audience: input.audience,
        mandatory,
      });
    }
    rule.enabled = input.enabled;
    rule.emailEnabled = input.emailEnabled;
    rule.smsEnabled = input.smsEnabled;
    rule.pushEnabled = input.pushEnabled;
    rule.whatsappEnabled = input.whatsappEnabled;
    rule.onScreenEnabled = input.onScreenEnabled;
    if (input.offsetMinutes !== undefined) {
      rule.offsetMinutes = input.offsetMinutes;
    }
    await this.ruleRepository.save(rule);
    return this.getCatalog();
  }

  async updateTemplate(
    input: AdminUpdateCommunicationTemplateInput,
  ): Promise<AdminCommunicationCatalog> {
    const catalog = findCatalogEntry(input.event, input.audience);
    if (!catalog) {
      throw new BadRequestException('Unknown communication event/audience');
    }

    const combined = [
      input.subject ?? '',
      input.title ?? '',
      input.body,
      input.text ?? '',
    ].join('\n');
    const unknown = assertKnownPlaceholders(combined, catalog.allowedVariables);
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown template variables: ${unknown.join(', ')}`,
      );
    }

    const templatePath = defaultTemplatePath(
      input.event,
      input.audience,
      input.channel,
    );
    const attributes: Record<string, string | undefined> = {};
    if (input.channel === CommunicationChannel.EMAIL) {
      attributes.subject = input.subject?.trim() || 'Tutorix';
      if (input.text?.trim()) {
        attributes.text = input.text.trim();
      }
    }
    if (
      input.channel === CommunicationChannel.PUSH ||
      input.channel === CommunicationChannel.ON_SCREEN
    ) {
      attributes.title = input.title?.trim() || 'Tutorix';
    }
    if (input.channel === CommunicationChannel.SMS) {
      attributes.dltTemplateId = input.dltTemplateId ?? '';
      attributes.dltEntityId = input.dltEntityId ?? '';
      attributes.dltHeader = input.dltHeader ?? '';
      attributes.variableMapping = input.variableMapping ?? '';
    }
    if (input.channel === CommunicationChannel.WHATSAPP) {
      attributes.whatsappTemplateName = input.whatsappTemplateName ?? '';
      attributes.variableMapping = input.variableMapping ?? '';
    }

    this.templateStore.write(
      templatePath,
      serializeTemplateFile(attributes, input.body),
    );

    let row = await this.templateRepository.findOne({
      where: {
        event: input.event,
        audience: input.audience,
        channel: input.channel,
      },
    });
    if (!row) {
      row = this.templateRepository.create({
        event: input.event,
        audience: input.audience,
        channel: input.channel,
        templatePath,
      });
    } else {
      row.templatePath = templatePath;
    }
    await this.templateRepository.save(row);
    return this.getCatalog();
  }

  preview(body: string, payloadJson: string, htmlEscape: boolean): string {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(payloadJson) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Invalid sample payload JSON');
    }
    return renderTemplate(body, payload, { htmlEscape });
  }

  private loadChannelTemplate(
    event: CommunicationEvent,
    audience: CommunicationAudience,
    channel: CommunicationChannel,
    templatePath: string,
  ): AdminCommunicationChannelTemplate {
    try {
      const file = this.templateStore.read(templatePath);
      return {
        channel,
        templatePath,
        subject: file.attributes.subject ?? null,
        title: file.attributes.title ?? null,
        text: file.attributes.text ?? null,
        body: file.body,
        dltTemplateId: file.attributes.dltTemplateId ?? null,
        dltEntityId: file.attributes.dltEntityId ?? null,
        dltHeader: file.attributes.dltHeader ?? null,
        whatsappTemplateName: file.attributes.whatsappTemplateName ?? null,
        variableMapping: file.attributes.variableMapping ?? null,
      };
    } catch {
      return {
        channel,
        templatePath,
        subject: null,
        title: null,
        text: null,
        body: '',
        dltTemplateId: null,
        dltEntityId: null,
        dltHeader: null,
        whatsappTemplateName: null,
        variableMapping: null,
      };
    }
  }
}
