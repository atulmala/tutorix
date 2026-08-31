import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InAppMessageEntity } from './entities/in-app-message.entity';
import { CommunicationRuleEntity } from './entities/communication-rule.entity';
import { CommunicationAudience } from './enums/communication-audience.enum';
import { CommunicationEvent } from './enums/communication-event.enum';
import { CommunicationChannel } from './enums/communication-channel.enum';
import {
  defaultTemplatePath,
  findCatalogEntry,
} from './event-catalog';
import { renderTemplate } from './template.renderer';
import { TemplateStore } from './template.store';
import { OnScreenCopy } from './dto/on-screen-copy.dto';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class InAppMessageService {
  constructor(
    @InjectRepository(InAppMessageEntity)
    private readonly messageRepository: Repository<InAppMessageEntity>,
    @InjectRepository(CommunicationRuleEntity)
    private readonly ruleRepository: Repository<CommunicationRuleEntity>,
    private readonly templateStore: TemplateStore,
  ) {}

  async listForUser(
    userId: number,
    event?: CommunicationEvent,
  ): Promise<InAppMessageEntity[]> {
    return this.messageRepository.find({
      where: {
        userId,
        deleted: false,
        ...(event ? { event } : {}),
      },
      order: { createdDate: 'DESC', id: 'DESC' },
    });
  }

  async onScreenCopy(
    user: Pick<User, 'firstName'>,
    event: CommunicationEvent,
  ): Promise<OnScreenCopy> {
    const audience = CommunicationAudience.ACTOR;
    const catalog = findCatalogEntry(event, audience);
    if (!catalog) {
      return { enabled: false, title: null, body: null };
    }

    const rule = await this.ruleRepository.findOne({
      where: { event, audience, deleted: false },
    });
    const enabled =
      (rule?.enabled ?? true) &&
      (rule?.onScreenEnabled ?? catalog.defaultChannels.onScreen);
    if (!enabled) {
      return { enabled: false, title: null, body: null };
    }

    const templatePath = defaultTemplatePath(
      event,
      audience,
      CommunicationChannel.ON_SCREEN,
    );
    try {
      const file = this.templateStore.read(templatePath);
      const payload = {
        firstName: user.firstName?.trim() || 'there',
      };
      return {
        enabled: true,
        title: file.attributes.title
          ? renderTemplate(file.attributes.title, payload)
          : null,
        body: renderTemplate(file.body, payload).trim() || null,
      };
    } catch {
      return { enabled: true, title: null, body: null };
    }
  }
}
