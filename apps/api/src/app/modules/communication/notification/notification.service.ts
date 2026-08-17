import { existsSync, readFileSync } from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import {
  SendNotificationInput,
  SendNotificationResult,
} from './notification.types';
import { DeviceTokenService } from './device-token.service';

export type NotificationProviderKind = 'fcm' | 'console';

/**
 * Push notifications (Firebase Cloud Messaging).
 * Analytics/Crashlytics stay in libs/common/analytics — this channel is user messaging only.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private app: admin.app.App | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly deviceTokenService: DeviceTokenService,
  ) {
    if (this.getProviderKind() === 'fcm') {
      this.app = this.initializeFirebase();
    }
  }

  getProviderKind(): NotificationProviderKind {
    const explicit = this.configService
      .get<string>('NOTIFICATION_PROVIDER')
      ?.trim()
      .toLowerCase();
    if (explicit === 'fcm' || explicit === 'console') {
      return explicit;
    }
    return this.hasCredentials() ? 'fcm' : 'console';
  }

  isConfigured(): boolean {
    return this.getProviderKind() === 'fcm' && this.app != null;
  }

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    if (this.getProviderKind() === 'console' || !this.app) {
      this.logger.log(
        `Push (console) userId=${input.userId ?? 'n/a'} title=${input.title}`,
      );
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(input.body);
      }
      return { success: true, messageId: null };
    }

    if (!input.userId) {
      this.logger.warn('Push skipped: userId is required for FCM');
      return { success: true, messageId: null };
    }

    const rows = await this.deviceTokenService.tokensForUser(input.userId);
    if (rows.length === 0) {
      this.logger.debug(`Push skipped: no device tokens for user ${input.userId}`);
      return { success: true, messageId: null };
    }

    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(input.data ?? {})) {
      if (value) {
        data[key] = value;
      }
    }

    const response = await admin.messaging(this.app).sendEachForMulticast({
      tokens: rows.map((row) => row.token),
      notification: { title: input.title, body: input.body },
      data,
    });

    const stale: string[] = [];
    response.responses.forEach((item, index) => {
      if (item.success) {
        return;
      }
      const code = item.error?.code ?? '';
      if (
        code.includes('registration-token-not-registered') ||
        code.includes('invalid-registration-token') ||
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        stale.push(rows[index].token);
      } else {
        this.logger.warn(
          `FCM send failed token=${rows[index].id}: ${item.error?.message}`,
        );
      }
    });
    if (stale.length > 0) {
      await this.deviceTokenService.deleteTokens(stale);
    }

    const messageId = response.responses.find((item) => item.messageId)
      ?.messageId ?? null;
    const anySuccess = response.successCount > 0 || stale.length === rows.length;
    return { success: anySuccess || response.failureCount === 0, messageId };
  }

  private hasCredentials(): boolean {
    const json = this.readEnv('FIREBASE_SERVICE_ACCOUNT_JSON');
    const path = this.readEnv('FIREBASE_SERVICE_ACCOUNT_PATH');
    return Boolean(json || (path && existsSync(path)));
  }

  private initializeFirebase(): admin.app.App | null {
    try {
      if (admin.apps.length > 0) {
        return admin.app();
      }
      const projectId = this.readEnv('FIREBASE_PROJECT_ID') || undefined;
      const json = this.readEnv('FIREBASE_SERVICE_ACCOUNT_JSON');
      const path = this.readEnv('FIREBASE_SERVICE_ACCOUNT_PATH');
      let credential: admin.credential.Credential | undefined;
      if (json) {
        credential = admin.credential.cert(JSON.parse(json) as admin.ServiceAccount);
      } else if (path && existsSync(path)) {
        credential = admin.credential.cert(
          JSON.parse(readFileSync(path, 'utf8')) as admin.ServiceAccount,
        );
      }
      if (!credential) {
        this.logger.warn('FCM requested but Firebase credentials are missing');
        return null;
      }
      return admin.initializeApp({ credential, projectId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize Firebase Admin for FCM: ${message}`);
      return null;
    }
  }

  private readEnv(key: string): string | null {
    const value =
      this.configService.get<string>(key)?.trim() || process.env[key]?.trim();
    return value || null;
  }
}
