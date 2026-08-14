import { Injectable, Logger } from '@nestjs/common';
import {
  SendNotificationInput,
  SendNotificationResult,
} from './notification.types';

/**
 * Push notifications (Firebase Cloud Messaging) will live here.
 * Analytics/Crashlytics stay in libs/common/analytics — this channel is user messaging only.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    this.logger.log(
      `Push (not configured) userId=${input.userId ?? 'n/a'} title=${input.title}`,
    );
    return { success: false, messageId: null };
  }
}
